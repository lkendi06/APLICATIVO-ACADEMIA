import type { UserGoal } from '@/types/database';

export type GoalProgress = {
  /** Valor atual calculado a partir dos dados reais (null se ainda não houver dado). */
  current: number | null;
  /** 0..1, ou null quando não é possível calcular. */
  ratio: number | null;
  reached: boolean;
};

/**
 * Progresso de um objetivo.
 * - Metas "de redução/aumento" (peso, gordura, carga) usam o valor inicial como ponto de partida
 *   e funcionam nos dois sentidos (perder ou ganhar).
 * - Metas semanais comparam o total da semana atual com o alvo.
 */
export function goalProgress(
  goal: Pick<UserGoal, 'type' | 'target_value' | 'start_value'>,
  current: number | null,
): GoalProgress {
  const target = goal.target_value;
  if (current == null || target == null) return { current, ratio: null, reached: false };

  if (goal.type === 'weekly_workouts' || goal.type === 'exercise_load') {
    if (goal.type === 'exercise_load' && goal.start_value != null && goal.start_value < target) {
      const ratio = clamp01((current - goal.start_value) / (target - goal.start_value));
      return { current, ratio, reached: current >= target };
    }
    const ratio = target > 0 ? clamp01(current / target) : 1;
    return { current, ratio, reached: current >= target };
  }

  const start = goal.start_value;
  if (start == null || start === target) {
    return {
      current,
      ratio: Math.abs(current - target) < 0.05 ? 1 : null,
      reached: Math.abs(current - target) < 0.05,
    };
  }
  const decreasing = target < start;
  const ratio = clamp01((start - current) / (start - target));
  const reached = decreasing ? current <= target : current >= target;
  return { current, ratio, reached };
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
