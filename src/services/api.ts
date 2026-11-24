import { supabase } from '@/lib/supabase';
import type {
  BodyMetric,
  Exercise,
  ExerciseSessionProgress,
  MuscleGroup,
  PreviousSet,
  Profile,
  UserGoal,
  UserPreferences,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSessionStats,
  WorkoutSet,
} from '@/types/database';

import type { ExerciseLite } from './activeWorkout';

/**
 * Camada de acesso a dados (repositórios). Todas as consultas passam pela RLS
 * do Supabase: o usuário só recebe as próprias linhas.
 */

function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

const EXERCISE_LITE = 'id, slug, name, primary_muscle, media_key, media_url, is_timed, equipment';

// ---------------------------------------------------------------------------
// Perfil e preferências
// ---------------------------------------------------------------------------
export const profileApi = {
  async get(userId: string): Promise<Profile> {
    return unwrap(await supabase.from('profiles').select('*').eq('id', userId).single());
  },
  async update(userId: string, patch: Partial<Profile>): Promise<Profile> {
    return unwrap(await supabase.from('profiles').update(patch).eq('id', userId).select().single());
  },
  async getPreferences(userId: string): Promise<UserPreferences> {
    return unwrap(
      await supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
    );
  },
  async updatePreferences(
    userId: string,
    patch: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    return unwrap(
      await supabase.from('user_preferences').update(patch).eq('user_id', userId).select().single(),
    );
  },
};

// ---------------------------------------------------------------------------
// Catálogo de exercícios e favoritos
// ---------------------------------------------------------------------------
export const exerciseApi = {
  async list(): Promise<Exercise[]> {
    return unwrap(await supabase.from('exercises').select('*').order('name'));
  },
  async get(id: string): Promise<Exercise> {
    return unwrap(await supabase.from('exercises').select('*').eq('id', id).single());
  },
  async favorites(): Promise<string[]> {
    const rows = unwrap(await supabase.from('exercise_favorites').select('exercise_id'));
    return rows.map((r) => r.exercise_id);
  },
  async setFavorite(exerciseId: string, favorite: boolean) {
    if (favorite) {
      unwrap(
        await supabase
          .from('exercise_favorites')
          .upsert(
            { exercise_id: exerciseId },
            { onConflict: 'user_id,exercise_id', ignoreDuplicates: true },
          ),
      );
    } else {
      unwrap(await supabase.from('exercise_favorites').delete().eq('exercise_id', exerciseId));
    }
  },
  async previousSets(exerciseId: string, excludeSession?: string | null): Promise<PreviousSet[]> {
    return unwrap(
      await supabase.rpc('previous_sets', {
        p_exercise_id: exerciseId,
        p_exclude_session: excludeSession ?? null,
      }),
    );
  },
  /** Última carga usada em cada exercício (para sugerir ao iniciar o treino). */
  async lastWeights(exerciseIds: string[]): Promise<Record<string, number>> {
    if (exerciseIds.length === 0) return {};
    const rows = unwrap(
      await supabase
        .from('exercise_session_progress')
        .select('exercise_id, max_weight_kg, started_at')
        .in('exercise_id', exerciseIds)
        .order('started_at', { ascending: false }),
    );
    const out: Record<string, number> = {};
    for (const r of rows)
      if (out[r.exercise_id] === undefined) out[r.exercise_id] = Number(r.max_weight_kg);
    return out;
  },
};

// ---------------------------------------------------------------------------
// Planos de treino
// ---------------------------------------------------------------------------
export type PlanItem = WorkoutPlanExercise & { exercise: ExerciseLite };
export type PlanWithItems = WorkoutPlan & { items: PlanItem[] };

export type PlanInput = {
  name: string;
  description?: string | null;
  color?: string | null;
  muscle_groups: MuscleGroup[];
  items: {
    id?: string;
    exercise_id: string;
    target_sets: number;
    target_reps: number;
    target_weight_kg: number | null;
    rest_seconds: number;
    notes?: string | null;
  }[];
};

export const planApi = {
  async list(): Promise<PlanWithItems[]> {
    const rows = unwrap(
      await supabase
        .from('workout_plans')
        .select(`*, items:workout_plan_exercises(*, exercise:exercises(${EXERCISE_LITE}))`)
        .is('archived_at', null)
        .order('position')
        .order('created_at'),
    ) as unknown as PlanWithItems[];
    return rows.map(sortItems);
  },
  async get(id: string): Promise<PlanWithItems> {
    const row = unwrap(
      await supabase
        .from('workout_plans')
        .select(`*, items:workout_plan_exercises(*, exercise:exercises(${EXERCISE_LITE}))`)
        .eq('id', id)
        .single(),
    ) as unknown as PlanWithItems;
    return sortItems(row);
  },
  async create(input: PlanInput): Promise<string> {
    const { data: maxRow } = await supabase
      .from('workout_plans')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    const plan = unwrap<{ id: string }>(
      (await supabase
        .from('workout_plans')
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          color: input.color ?? null,
          muscle_groups: input.muscle_groups,
          position: (maxRow?.position ?? -1) + 1,
        })
        .select('id')
        .single()) as { data: { id: string } | null; error: unknown },
    );
    await planApi.replaceItems(plan.id, input.items);
    return plan.id;
  },
  async update(id: string, input: PlanInput): Promise<void> {
    unwrap(
      await supabase
        .from('workout_plans')
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          color: input.color ?? null,
          muscle_groups: input.muscle_groups,
        })
        .eq('id', id),
    );
    await planApi.replaceItems(id, input.items);
  },
  /** Sincroniza a lista de exercícios do plano (insere, atualiza, remove, reordena). */
  async replaceItems(planId: string, items: PlanInput['items']) {
    const existing = unwrap(
      await supabase.from('workout_plan_exercises').select('id').eq('plan_id', planId),
    );
    const keep = new Set(items.filter((i) => i.id).map((i) => i.id!));
    const toDelete = existing.map((e) => e.id).filter((id) => !keep.has(id));
    if (toDelete.length) {
      unwrap(await supabase.from('workout_plan_exercises').delete().in('id', toDelete));
    }
    // A restrição de posição única é "deferrable": o upsert em lote reordena sem conflito.
    const rows = items.map((i, position) => ({
      ...(i.id ? { id: i.id } : {}),
      plan_id: planId,
      exercise_id: i.exercise_id,
      position,
      target_sets: i.target_sets,
      target_reps: i.target_reps,
      target_weight_kg: i.target_weight_kg,
      rest_seconds: i.rest_seconds,
      notes: i.notes ?? null,
    }));
    const withId = rows.filter((r) => 'id' in r);
    const withoutId = rows.filter((r) => !('id' in r));
    if (withId.length) {
      unwrap(
        await supabase.from('workout_plan_exercises').upsert(withId as never, { onConflict: 'id' }),
      );
    }
    if (withoutId.length) {
      unwrap(await supabase.from('workout_plan_exercises').insert(withoutId as never));
    }
  },
  async remove(id: string) {
    unwrap(await supabase.from('workout_plans').delete().eq('id', id));
  },
  async duplicate(id: string): Promise<string> {
    return unwrap(await supabase.rpc('duplicate_workout_plan', { p_plan_id: id }));
  },
};

function sortItems(p: PlanWithItems): PlanWithItems {
  return { ...p, items: [...(p.items ?? [])].sort((a, b) => a.position - b.position) };
}

// ---------------------------------------------------------------------------
// Sessões (histórico)
// ---------------------------------------------------------------------------
export type SessionDetail = WorkoutSession & {
  exercises: (WorkoutSessionExercise & { exercise: ExerciseLite; sets: WorkoutSet[] })[];
};

export const sessionApi = {
  async stats(params?: { from?: Date; to?: Date; limit?: number }): Promise<WorkoutSessionStats[]> {
    let q = supabase
      .from('workout_session_stats')
      .select('*')
      .eq('status', 'completed')
      .order('started_at', { ascending: false });
    if (params?.from) q = q.gte('started_at', params.from.toISOString());
    if (params?.to) q = q.lte('started_at', params.to.toISOString());
    if (params?.limit) q = q.limit(params.limit);
    return unwrap(await q).map((r) => ({
      ...r,
      total_volume_kg: Number(r.total_volume_kg),
      total_reps: Number(r.total_reps),
      completed_sets: Number(r.completed_sets),
      exercise_count: Number(r.exercise_count),
    }));
  },
  async detail(id: string): Promise<SessionDetail> {
    const row = unwrap(
      await supabase
        .from('workout_sessions')
        .select(
          `*, exercises:workout_session_exercises(*, exercise:exercises(${EXERCISE_LITE}), sets:workout_sets(*))`,
        )
        .eq('id', id)
        .single(),
    ) as unknown as SessionDetail;
    row.exercises = [...(row.exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ ...e, sets: [...e.sets].sort((a, b) => a.set_number - b.set_number) }));
    return row;
  },
  async remove(id: string) {
    unwrap(await supabase.from('workout_sessions').delete().eq('id', id));
  },
  async exerciseProgress(exerciseId: string, from?: Date): Promise<ExerciseSessionProgress[]> {
    let q = supabase
      .from('exercise_session_progress')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('started_at');
    if (from) q = q.gte('started_at', from.toISOString());
    return unwrap(await q).map((r) => ({
      ...r,
      max_weight_kg: Number(r.max_weight_kg),
      volume_kg: Number(r.volume_kg),
      total_reps: Number(r.total_reps),
      estimated_1rm_kg: Number(r.estimated_1rm_kg),
    }));
  },
  /** Exercícios que o usuário já treinou (para filtros do histórico). */
  async trainedExercises(): Promise<ExerciseLite[]> {
    const rows = unwrap(
      await supabase
        .from('workout_session_exercises')
        .select(`exercise:exercises(${EXERCISE_LITE})`)
        .limit(1000),
    ) as unknown as { exercise: ExerciseLite }[];
    const map = new Map<string, ExerciseLite>();
    rows.forEach((r) => r.exercise && map.set(r.exercise.id, r.exercise));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  },
};

// ---------------------------------------------------------------------------
// Métricas corporais
// ---------------------------------------------------------------------------
export type MetricInput = Partial<
  Pick<
    BodyMetric,
    | 'weight_kg'
    | 'height_cm'
    | 'waist_cm'
    | 'arm_cm'
    | 'chest_cm'
    | 'hip_cm'
    | 'thigh_cm'
    | 'body_fat_pct'
    | 'notes'
    | 'measured_at'
  >
>;

export const metricsApi = {
  async list(params?: { from?: Date; to?: Date }): Promise<BodyMetric[]> {
    let q = supabase.from('body_metrics').select('*').order('measured_at', { ascending: false });
    if (params?.from) q = q.gte('measured_at', params.from.toISOString());
    if (params?.to) q = q.lte('measured_at', params.to.toISOString());
    return unwrap(await q).map(normalizeMetric);
  },
  async create(input: MetricInput): Promise<BodyMetric> {
    return normalizeMetric(
      unwrap(await supabase.from('body_metrics').insert(input).select().single()),
    );
  },
  async update(id: string, input: MetricInput): Promise<BodyMetric> {
    return normalizeMetric(
      unwrap(await supabase.from('body_metrics').update(input).eq('id', id).select().single()),
    );
  },
  async remove(id: string) {
    unwrap(await supabase.from('body_metrics').delete().eq('id', id));
  },
};

function normalizeMetric(m: BodyMetric): BodyMetric {
  const n = (v: number | null) => (v == null ? null : Number(v));
  return {
    ...m,
    weight_kg: n(m.weight_kg),
    height_cm: n(m.height_cm),
    waist_cm: n(m.waist_cm),
    arm_cm: n(m.arm_cm),
    chest_cm: n(m.chest_cm),
    hip_cm: n(m.hip_cm),
    thigh_cm: n(m.thigh_cm),
    body_fat_pct: n(m.body_fat_pct),
  };
}

// ---------------------------------------------------------------------------
// Objetivos
// ---------------------------------------------------------------------------
export const goalsApi = {
  async list(): Promise<UserGoal[]> {
    return unwrap(
      await supabase.from('user_goals').select('*').order('created_at', { ascending: false }),
    );
  },
  async create(input: Pick<UserGoal, 'type' | 'title'> & Partial<UserGoal>) {
    return unwrap(await supabase.from('user_goals').insert(input).select().single());
  },
  async update(id: string, patch: Partial<UserGoal>) {
    return unwrap(await supabase.from('user_goals').update(patch).eq('id', id).select().single());
  },
  async remove(id: string) {
    unwrap(await supabase.from('user_goals').delete().eq('id', id));
  },
};
