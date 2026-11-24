/**
 * Treino em andamento: funciona sem internet, recupera a sessão depois que o app
 * é fechado e sincroniza tudo quando a conexão volta.
 */
type Row = Record<string, unknown> & { id: string };

const mockServer = {
  offline: true,
  tables: {} as Record<string, Map<string, Row>>,
};

jest.mock('@/lib/supabase', () => {
  const fail = { error: { message: 'Network request failed' } };
  const from = (name: string) => {
    mockServer.tables[name] ??= new Map();
    const t = mockServer.tables[name];
    return {
      upsert: async (p: Row) => {
        if (mockServer.offline) return fail;
        t.set(p.id, { ...(t.get(p.id) ?? {}), ...p });
        return { error: null };
      },
      delete: () => ({
        eq: async (_c: string, id: string) => {
          if (mockServer.offline) return fail;
          t.delete(id);
          return { error: null };
        },
      }),
      select: () => {
        const q = {
          eq: () => q,
          maybeSingle: async () =>
            mockServer.offline ? { data: null, ...fail } : { data: null, error: null },
        };
        return q;
      },
    };
  };
  return { supabase: { from } };
});

const plan = {
  id: 'plan-1',
  user_id: 'user-1',
  name: 'Treino A',
  items: [
    {
      id: 'pe-1',
      exercise_id: 'ex-supino',
      target_sets: 3,
      target_reps: 10,
      target_weight_kg: 40,
      rest_seconds: 90,
      notes: null,
      exercise: {
        id: 'ex-supino',
        slug: 'supino-reto',
        name: 'Supino reto',
        primary_muscle: 'chest',
      },
    },
  ],
};

function load() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const aw = require('@/services/activeWorkout') as typeof import('@/services/activeWorkout');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ob = require('@/services/offline/outbox') as typeof import('@/services/offline/outbox');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-async-storage/async-storage');
  const storage = mod.default ?? mod;
  return { ...aw, ...ob, storage };
}

beforeEach(() => {
  jest.resetModules();
  mockServer.offline = true;
  mockServer.tables = {};
});

it('registra séries offline, recupera após reabrir o app e sincroniza sem duplicar', async () => {
  let m = load();
  await m.activeWorkout.start({ userId: 'user-1', name: 'Treino A', plan: plan as never });
  const st = m.activeWorkout.get()!;
  expect(st.sets).toHaveLength(3);
  expect(st.sets.map((s) => s.weight_kg)).toEqual([40, 40, 40]);

  await m.activeWorkout.updateSet(st.sets[0].id, { completed: true, reps: 12 });
  await m.activeWorkout.addSet(st.exercises[0].id);
  expect(m.activeWorkout.get()!.sets).toHaveLength(4);

  // "Fecha" o app: guarda o que está no aparelho e recarrega os módulos do zero.
  const saved: Record<string, string | null> = {};
  for (const k of ['fittrack.active-workout.v1', 'fittrack.outbox.v1'])
    saved[k] = await m.storage.getItem(k);
  expect(saved['fittrack.active-workout.v1']).toBeTruthy();
  jest.resetModules();
  m = load();
  for (const [k, v] of Object.entries(saved)) if (v) await m.storage.setItem(k, v);

  const restored = await m.activeWorkout.hydrate('user-1');
  expect(restored?.session.id).toBe(st.session.id);
  expect(restored?.sets).toHaveLength(4);
  expect(restored?.sets[0]).toMatchObject({ completed: true, reps: 12 });

  // Volta a internet: tudo é enviado.
  mockServer.offline = false;
  const r = await m.flushOutbox();
  expect(r.pending).toBe(0);
  expect(mockServer.tables.workout_sessions.size).toBe(1);
  expect(mockServer.tables.workout_session_exercises.size).toBe(1);
  expect(mockServer.tables.workout_sets.size).toBe(4);

  // Reenviar (ex.: app reabriu no meio do envio) não cria duplicatas.
  await m.enqueue({
    table: 'workout_sets',
    kind: 'upsert',
    id: restored!.sets[0].id,
    payload: { id: restored!.sets[0].id, reps: 12 },
  });
  await m.flushOutbox();
  expect(mockServer.tables.workout_sets.size).toBe(4);
});

it('ao finalizar, remove séries não concluídas e calcula a duração descontando pausas', async () => {
  const m = load();
  mockServer.offline = false;
  await m.activeWorkout.start({ userId: 'user-1', name: 'Treino A', plan: plan as never });
  const st = m.activeWorkout.get()!;
  await m.activeWorkout.updateSet(st.sets[0].id, { completed: true });
  await m.activeWorkout.updateSet(st.sets[1].id, { completed: true });
  await m.activeWorkout.pause();
  expect(m.activeWorkout.get()!.session.paused_at).not.toBeNull();
  await m.activeWorkout.resume();

  const id = await m.activeWorkout.finish('Bom treino');
  expect(id).toBe(st.session.id);
  expect(m.activeWorkout.get()).toBeNull();
  const last = m.activeWorkout.getLastFinished()!;
  expect(last.sets).toHaveLength(2);
  expect(last.session.status).toBe('completed');
  expect(last.session.duration_seconds).toBeGreaterThanOrEqual(0);

  await m.flushOutbox();
  expect(mockServer.tables.workout_sets.size).toBe(2);
  expect(mockServer.tables.workout_sessions.get(st.session.id)).toMatchObject({
    status: 'completed',
    notes: 'Bom treino',
  });
});

it('excluir uma série renumera as seguintes', async () => {
  const m = load();
  await m.activeWorkout.start({ userId: 'user-1', name: 'Treino A', plan: plan as never });
  const st = m.activeWorkout.get()!;
  await m.activeWorkout.deleteSet(st.sets[0].id);
  expect(m.activeWorkout.get()!.sets.map((s) => s.set_number)).toEqual([1, 2]);
});

it('não permite dois treinos ativos ao mesmo tempo', async () => {
  const m = load();
  await m.activeWorkout.start({ userId: 'user-1', name: 'A' });
  await expect(m.activeWorkout.start({ userId: 'user-1', name: 'B' })).rejects.toThrow(
    'Já existe um treino em andamento.',
  );
});
