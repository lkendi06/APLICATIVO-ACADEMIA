import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import type {
  Exercise,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
} from '@/types/database';
import { uuid } from '@/utils/uuid';

import { enqueue, flushOutbox } from './offline/outbox';

/**
 * Treino em andamento.
 *
 * O estado fica no aparelho (para continuar mesmo sem internet ou se o app for
 * fechado) e cada alteração é enviada ao banco pela fila de sincronização.
 */

export type ExerciseLite = Pick<
  Exercise,
  'id' | 'slug' | 'name' | 'primary_muscle' | 'media_key' | 'media_url' | 'is_timed' | 'equipment'
>;

export type ActiveExercise = WorkoutSessionExercise & { exercise: ExerciseLite };

export type RestTimer = { endsAt: number; total: number; exerciseName: string } | null;

export type ActiveWorkoutState = {
  userId: string;
  session: WorkoutSession;
  exercises: ActiveExercise[];
  sets: WorkoutSet[];
  rest: RestTimer;
};

type Listener = () => void;
const STORAGE_KEY = 'fittrack.active-workout.v1';

let state: ActiveWorkoutState | null = null;
/** Último treino finalizado (para mostrar o resumo mesmo sem internet). */
let lastFinished: ActiveWorkoutState | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

async function save() {
  if (state) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  else await AsyncStorage.removeItem(STORAGE_KEY);
}

function set(next: ActiveWorkoutState | null) {
  state = next;
  emit();
  save().catch(() => undefined);
}

function sync() {
  flushOutbox().catch(() => undefined);
}

const nowIso = () => new Date().toISOString();

export const activeWorkout = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get(): ActiveWorkoutState | null {
    return state;
  },
  isHydrated() {
    return hydrated;
  },
  getLastFinished() {
    return lastFinished;
  },

  /**
   * Recupera o treino em andamento: primeiro do aparelho; se não houver,
   * do servidor (ex.: app reinstalado ou outro aparelho).
   */
  async hydrate(userId: string): Promise<ActiveWorkoutState | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const local = raw ? (JSON.parse(raw) as ActiveWorkoutState) : null;
      if (local && local.userId === userId) {
        state = local;
      } else {
        state = null;
        if (local) await AsyncStorage.removeItem(STORAGE_KEY);
        state = await fetchActiveFromServer(userId);
        if (state) await save();
      }
    } catch {
      // Sem rede e sem dados locais: segue sem treino ativo.
    }
    hydrated = true;
    emit();
    return state;
  },

  reset() {
    state = null;
    hydrated = false;
    emit();
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  },

  async start(params: {
    userId: string;
    name: string;
    plan?: (WorkoutPlan & { items: (WorkoutPlanExercise & { exercise: ExerciseLite })[] }) | null;
    lastWeights?: Record<string, number>;
  }) {
    if (state) throw new Error('Já existe um treino em andamento.');
    const ts = nowIso();
    const session: WorkoutSession = {
      id: uuid(),
      user_id: params.userId,
      plan_id: params.plan?.id ?? null,
      name: params.name,
      status: 'active',
      started_at: ts,
      ended_at: null,
      paused_at: null,
      total_paused_seconds: 0,
      duration_seconds: null,
      notes: null,
      created_at: ts,
      updated_at: ts,
    };
    const exercises: ActiveExercise[] = [];
    const sets: WorkoutSet[] = [];
    (params.plan?.items ?? []).forEach((item, i) => {
      const se: ActiveExercise = {
        id: uuid(),
        session_id: session.id,
        user_id: params.userId,
        exercise_id: item.exercise_id,
        plan_exercise_id: item.id,
        position: i,
        target_sets: item.target_sets,
        target_reps: item.target_reps,
        target_weight_kg: item.target_weight_kg,
        rest_seconds: item.rest_seconds,
        notes: item.notes,
        created_at: ts,
        updated_at: ts,
        exercise: item.exercise,
      };
      exercises.push(se);
      const weight = item.target_weight_kg ?? params.lastWeights?.[item.exercise_id] ?? 0;
      for (let n = 1; n <= item.target_sets; n++) {
        sets.push(newSet(se, n, item.target_reps, weight));
      }
    });
    set({ userId: params.userId, session, exercises, sets, rest: null });

    await enqueue({
      table: 'workout_sessions',
      kind: 'upsert',
      id: session.id,
      payload: sessionPayload(session),
    });
    for (const se of exercises) {
      await enqueue({
        table: 'workout_session_exercises',
        kind: 'upsert',
        id: se.id,
        payload: sePayload(se),
      });
    }
    for (const s of sets) {
      await enqueue({ table: 'workout_sets', kind: 'upsert', id: s.id, payload: setPayload(s) });
    }
    sync();
    return session;
  },

  async addExercise(
    exercise: ExerciseLite,
    opts?: { restSeconds?: number; sets?: number; reps?: number; weight?: number },
  ) {
    if (!state) return;
    const ts = nowIso();
    const se: ActiveExercise = {
      id: uuid(),
      session_id: state.session.id,
      user_id: state.userId,
      exercise_id: exercise.id,
      plan_exercise_id: null,
      position: state.exercises.length,
      target_sets: opts?.sets ?? 3,
      target_reps: opts?.reps ?? 10,
      target_weight_kg: opts?.weight ?? null,
      rest_seconds: opts?.restSeconds ?? 90,
      notes: null,
      created_at: ts,
      updated_at: ts,
      exercise,
    };
    const newSets = Array.from({ length: se.target_sets ?? 3 }, (_, i) =>
      newSet(se, i + 1, se.target_reps ?? 10, opts?.weight ?? 0),
    );
    set({ ...state, exercises: [...state.exercises, se], sets: [...state.sets, ...newSets] });
    await enqueue({
      table: 'workout_session_exercises',
      kind: 'upsert',
      id: se.id,
      payload: sePayload(se),
    });
    for (const s of newSets)
      await enqueue({ table: 'workout_sets', kind: 'upsert', id: s.id, payload: setPayload(s) });
    sync();
  },

  async removeExercise(sessionExerciseId: string) {
    if (!state) return;
    set({
      ...state,
      exercises: state.exercises.filter((e) => e.id !== sessionExerciseId),
      sets: state.sets.filter((s) => s.session_exercise_id !== sessionExerciseId),
    });
    // As séries são removidas em cascata no banco.
    await enqueue({ table: 'workout_session_exercises', kind: 'delete', id: sessionExerciseId });
    sync();
  },

  async addSet(sessionExerciseId: string) {
    if (!state) return;
    const se = state.exercises.find((e) => e.id === sessionExerciseId);
    if (!se) return;
    const existing = state.sets.filter((s) => s.session_exercise_id === sessionExerciseId);
    const last = existing[existing.length - 1];
    const s = newSet(
      se,
      existing.length + 1,
      last?.reps ?? se.target_reps ?? 10,
      last?.weight_kg ?? se.target_weight_kg ?? 0,
    );
    set({ ...state, sets: [...state.sets, s] });
    await enqueue({ table: 'workout_sets', kind: 'upsert', id: s.id, payload: setPayload(s) });
    sync();
  },

  async updateSet(
    setId: string,
    patch: Partial<Pick<WorkoutSet, 'reps' | 'weight_kg' | 'completed' | 'duration_seconds'>>,
  ) {
    if (!state) return;
    const ts = nowIso();
    let updated: WorkoutSet | undefined;
    const sets = state.sets.map((s) => {
      if (s.id !== setId) return s;
      const completedAt =
        patch.completed === undefined ? s.completed_at : patch.completed ? ts : null;
      updated = { ...s, ...patch, completed_at: completedAt, updated_at: ts };
      return updated;
    });
    if (!updated) return;
    set({ ...state, sets });
    await enqueue({
      table: 'workout_sets',
      kind: 'upsert',
      id: setId,
      payload: setPayload(updated),
    });
    sync();
  },

  async deleteSet(setId: string) {
    if (!state) return;
    const target = state.sets.find((s) => s.id === setId);
    if (!target) return;
    // Renumera as séries seguintes do mesmo exercício.
    const changed: WorkoutSet[] = [];
    let n = 0;
    const sets = state.sets
      .filter((s) => s.id !== setId)
      .map((s) => {
        if (s.session_exercise_id !== target.session_exercise_id) return s;
        n += 1;
        if (s.set_number !== n) {
          const u = { ...s, set_number: n };
          changed.push(u);
          return u;
        }
        return s;
      });
    set({ ...state, sets });
    await enqueue({ table: 'workout_sets', kind: 'delete', id: setId });
    for (const c of changed)
      await enqueue({ table: 'workout_sets', kind: 'upsert', id: c.id, payload: setPayload(c) });
    sync();
  },

  startRest(seconds: number, exerciseName: string) {
    if (!state) return;
    set({ ...state, rest: { endsAt: Date.now() + seconds * 1000, total: seconds, exerciseName } });
  },
  adjustRest(deltaSeconds: number) {
    if (!state?.rest) return;
    const endsAt = Math.max(Date.now(), state.rest.endsAt + deltaSeconds * 1000);
    set({
      ...state,
      rest: { ...state.rest, endsAt, total: Math.max(1, state.rest.total + deltaSeconds) },
    });
  },
  stopRest() {
    if (!state) return;
    set({ ...state, rest: null });
  },

  async pause() {
    if (!state || state.session.paused_at) return;
    const session = { ...state.session, paused_at: nowIso(), updated_at: nowIso() };
    set({ ...state, session, rest: null });
    await enqueue({
      table: 'workout_sessions',
      kind: 'upsert',
      id: session.id,
      payload: sessionPayload(session),
    });
    sync();
  },

  async resume() {
    if (!state || !state.session.paused_at) return;
    const pausedFor = Math.floor((Date.now() - new Date(state.session.paused_at).getTime()) / 1000);
    const session = {
      ...state.session,
      paused_at: null,
      total_paused_seconds: state.session.total_paused_seconds + Math.max(0, pausedFor),
      updated_at: nowIso(),
    };
    set({ ...state, session });
    await enqueue({
      table: 'workout_sessions',
      kind: 'upsert',
      id: session.id,
      payload: sessionPayload(session),
    });
    sync();
  },

  /** Finaliza o treino. Séries não concluídas e vazias são descartadas. */
  async finish(notes?: string): Promise<string | null> {
    if (!state) return null;
    const current = state;
    const empty = current.sets.filter((s) => !s.completed);
    for (const s of empty) await enqueue({ table: 'workout_sets', kind: 'delete', id: s.id });
    const ended = nowIso();
    let paused = current.session.total_paused_seconds;
    if (current.session.paused_at) {
      paused += Math.floor((Date.now() - new Date(current.session.paused_at).getTime()) / 1000);
    }
    const session: WorkoutSession = {
      ...current.session,
      status: 'completed',
      ended_at: ended,
      paused_at: null,
      total_paused_seconds: paused,
      notes: notes?.trim() ? notes.trim() : current.session.notes,
      updated_at: ended,
    };
    await enqueue({
      table: 'workout_sessions',
      kind: 'upsert',
      id: session.id,
      payload: sessionPayload(session),
    });
    lastFinished = {
      ...current,
      session: {
        ...session,
        duration_seconds: Math.max(
          0,
          Math.floor((Date.parse(ended) - Date.parse(session.started_at)) / 1000) - paused,
        ),
      },
      sets: current.sets.filter((s) => s.completed),
      rest: null,
    };
    set(null);
    await flushOutbox().catch(() => undefined);
    return session.id;
  },

  /** Descarta o treino em andamento (apaga do banco). */
  async discard() {
    if (!state) return;
    const id = state.session.id;
    set(null);
    await enqueue({ table: 'workout_sessions', kind: 'delete', id });
    sync();
  },
};

function newSet(se: WorkoutSessionExercise, n: number, reps: number, weight: number): WorkoutSet {
  const ts = nowIso();
  return {
    id: uuid(),
    session_exercise_id: se.id,
    user_id: se.user_id,
    set_number: n,
    reps,
    weight_kg: weight,
    duration_seconds: null,
    completed: false,
    completed_at: null,
    created_at: ts,
    updated_at: ts,
  };
}

function sessionPayload(s: WorkoutSession) {
  return {
    id: s.id,
    user_id: s.user_id,
    plan_id: s.plan_id,
    name: s.name,
    status: s.status,
    started_at: s.started_at,
    ended_at: s.ended_at,
    paused_at: s.paused_at,
    total_paused_seconds: s.total_paused_seconds,
    notes: s.notes,
  };
}

function sePayload(se: ActiveExercise) {
  return {
    id: se.id,
    session_id: se.session_id,
    user_id: se.user_id,
    exercise_id: se.exercise_id,
    plan_exercise_id: se.plan_exercise_id,
    position: se.position,
    target_sets: se.target_sets,
    target_reps: se.target_reps,
    target_weight_kg: se.target_weight_kg,
    rest_seconds: se.rest_seconds,
    notes: se.notes,
  };
}

function setPayload(s: WorkoutSet) {
  return {
    id: s.id,
    session_exercise_id: s.session_exercise_id,
    user_id: s.user_id,
    set_number: s.set_number,
    reps: s.reps,
    weight_kg: s.weight_kg,
    duration_seconds: s.duration_seconds,
    completed: s.completed,
    completed_at: s.completed_at,
  };
}

const EXERCISE_LITE = 'id, slug, name, primary_muscle, media_key, media_url, is_timed, equipment';

async function fetchActiveFromServer(userId: string): Promise<ActiveWorkoutState | null> {
  const { data: session, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;
  const { data: exs, error: e2 } = await supabase
    .from('workout_session_exercises')
    .select(`*, exercise:exercises(${EXERCISE_LITE})`)
    .eq('session_id', session.id)
    .order('position');
  if (e2) throw e2;
  const ids = (exs ?? []).map((e) => e.id);
  const { data: sets, error: e3 } = ids.length
    ? await supabase
        .from('workout_sets')
        .select('*')
        .in('session_exercise_id', ids)
        .order('set_number')
    : { data: [] as WorkoutSet[], error: null };
  if (e3) throw e3;
  return {
    userId,
    session: session as WorkoutSession,
    exercises: (exs ?? []) as unknown as ActiveExercise[],
    sets: (sets ?? []) as WorkoutSet[],
    rest: null,
  };
}

export { sessionPayload as _sessionPayload, setPayload as _setPayload };
