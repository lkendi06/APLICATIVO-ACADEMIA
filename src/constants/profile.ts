import type { FitnessGoal, GoalType, Sex } from '@/types/database';

export const FITNESS_GOAL_LABEL: Record<FitnessGoal, string> = {
  lose_weight: 'Emagrecer',
  gain_muscle: 'Ganhar massa muscular',
  maintain: 'Manter o peso',
  endurance: 'Resistência',
  health: 'Saúde e bem-estar',
};

export const SEX_LABEL: Record<Sex, string> = {
  female: 'Feminino',
  male: 'Masculino',
  other: 'Outro',
  prefer_not_to_say: 'Prefiro não informar',
};

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  target_weight: 'Peso-alvo',
  weekly_workouts: 'Treinos por semana',
  body_fat: 'Gordura corporal',
  exercise_load: 'Carga em um exercício',
  custom: 'Personalizado',
};
