/**
 * Fila offline: idempotência, junção de operações e reenvio após queda de rede.
 * O Supabase é substituído por um servidor falso em memória.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

type Row = Record<string, unknown> & { id: string };
const mockDb: Record<string, Map<string, Row>> = {};
const mockState = { offline: false };
const mockCalls: string[] = [];

jest.mock('@/lib/supabase', () => {
  const table = (name: string) => {
    mockDb[name] ??= new Map();
    return {
      upsert: async (payload: Row) => {
        mockCalls.push(`upsert:${name}:${payload.id}`);
        if (mockState.offline) return { error: { message: 'Network request failed' } };
        mockDb[name].set(payload.id, { ...(mockDb[name].get(payload.id) ?? {}), ...payload });
        return { error: null };
      },
      delete: () => ({
        eq: async (_col: string, id: string) => {
          mockCalls.push(`delete:${name}:${id}`);
          if (mockState.offline) return { error: { message: 'Network request failed' } };
          mockDb[name].delete(id);
          return { error: null };
        },
      }),
    };
  };
  return { supabase: { from: table } };
});

// eslint-disable-next-line import/first
import { clearOutbox, enqueue, flushOutbox, getOutboxSnapshot } from '@/services/offline/outbox';

beforeEach(async () => {
  mockState.offline = false;
  mockCalls.length = 0;
  for (const k of Object.keys(mockDb)) delete mockDb[k];
  await clearOutbox();
});

describe('outbox', () => {
  it('junta várias edições da mesma linha em uma única operação', async () => {
    await enqueue({
      table: 'workout_sets',
      kind: 'upsert',
      id: 's1',
      payload: { id: 's1', reps: 10 },
    });
    await enqueue({
      table: 'workout_sets',
      kind: 'upsert',
      id: 's1',
      payload: { id: 's1', weight_kg: 40 },
    });
    expect(getOutboxSnapshot()).toHaveLength(1);
    expect(getOutboxSnapshot()[0].payload).toEqual({ id: 's1', reps: 10, weight_kg: 40 });
  });

  it('exclusão descarta upserts pendentes da mesma linha', async () => {
    await enqueue({ table: 'workout_sets', kind: 'upsert', id: 's1', payload: { id: 's1' } });
    await enqueue({ table: 'workout_sets', kind: 'delete', id: 's1' });
    expect(getOutboxSnapshot().map((o) => o.kind)).toEqual(['delete']);
  });

  it('persiste no aparelho', async () => {
    await enqueue({ table: 'workout_sessions', kind: 'upsert', id: 'w1', payload: { id: 'w1' } });
    const raw = await AsyncStorage.getItem('fittrack.outbox.v1');
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it('mantém a fila sem internet e envia quando a conexão volta', async () => {
    mockState.offline = true;
    await enqueue({
      table: 'workout_sessions',
      kind: 'upsert',
      id: 'w1',
      payload: { id: 'w1', name: 'A' },
    });
    await enqueue({
      table: 'workout_sets',
      kind: 'upsert',
      id: 's1',
      payload: { id: 's1', reps: 8 },
    });
    const r1 = await flushOutbox();
    expect(r1).toMatchObject({ sent: 0, pending: 2, offline: true });
    expect(mockDb.workout_sessions?.size ?? 0).toBe(0);

    mockState.offline = false;
    const r2 = await flushOutbox();
    expect(r2).toMatchObject({ sent: 2, pending: 0, offline: false });
    expect(mockDb.workout_sessions.get('w1')).toEqual({ id: 'w1', name: 'A' });
    expect(mockDb.workout_sets.get('s1')).toEqual({ id: 's1', reps: 8 });
  });

  it('reenviar a mesma operação não duplica registros (upsert por id)', async () => {
    await enqueue({
      table: 'workout_sets',
      kind: 'upsert',
      id: 's1',
      payload: { id: 's1', reps: 8 },
    });
    await flushOutbox();
    await enqueue({
      table: 'workout_sets',
      kind: 'upsert',
      id: 's1',
      payload: { id: 's1', reps: 8 },
    });
    await flushOutbox();
    expect(mockDb.workout_sets.size).toBe(1);
    expect(mockCalls.filter((c) => c === 'upsert:workout_sets:s1')).toHaveLength(2);
  });

  it('envia na ordem em que as operações foram criadas', async () => {
    await enqueue({ table: 'workout_sessions', kind: 'upsert', id: 'w1', payload: { id: 'w1' } });
    await enqueue({
      table: 'workout_session_exercises',
      kind: 'upsert',
      id: 'e1',
      payload: { id: 'e1' },
    });
    await enqueue({ table: 'workout_sets', kind: 'upsert', id: 's1', payload: { id: 's1' } });
    await flushOutbox();
    expect(mockCalls).toEqual([
      'upsert:workout_sessions:w1',
      'upsert:workout_session_exercises:e1',
      'upsert:workout_sets:s1',
    ]);
  });

  it('chamadas simultâneas de flush não enviam em dobro', async () => {
    await enqueue({ table: 'workout_sets', kind: 'upsert', id: 's1', payload: { id: 's1' } });
    await Promise.all([flushOutbox(), flushOutbox(), flushOutbox()]);
    expect(mockCalls).toEqual(['upsert:workout_sets:s1']);
  });
});
