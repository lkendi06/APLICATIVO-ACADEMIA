export type SetLike = { reps: number; weight_kg: number; completed: boolean };

export type WorkoutTotals = {
  completedSets: number;
  totalReps: number;
  volumeKg: number;
};

export function computeTotals(sets: SetLike[]): WorkoutTotals {
  let completedSets = 0;
  let totalReps = 0;
  let volumeKg = 0;
  for (const s of sets) {
    if (!s.completed) continue;
    completedSets += 1;
    totalReps += s.reps;
    volumeKg += s.reps * s.weight_kg;
  }
  return { completedSets, totalReps, volumeKg: Math.round(volumeKg * 100) / 100 };
}

/** 1RM estimado (Epley). Útil para comparar sessões com cargas/repetições diferentes. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Tempo efetivo de treino considerando pausas. */
export function elapsedSeconds(
  session: { started_at: string; paused_at: string | null; total_paused_seconds: number },
  now = Date.now(),
): number {
  const start = new Date(session.started_at).getTime();
  const end = session.paused_at ? new Date(session.paused_at).getTime() : now;
  return Math.max(0, Math.floor((end - start) / 1000) - session.total_paused_seconds);
}
