/**
 * Tipos do banco de dados (espelham supabase/migrations).
 * Podem ser regenerados com: npx supabase gen types typescript --project-id <id>
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type SessionStatus = 'active' | 'completed';
export type GoalType =
  'target_weight' | 'weekly_workouts' | 'body_fat' | 'exercise_load' | 'custom';
export type GoalStatus = 'active' | 'achieved' | 'archived';
export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'endurance' | 'health';
export type Sex = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export type Profile = {
  id: string;
  full_name: string;
  avatar_path: string | null;
  birth_date: string | null;
  sex: Sex | null;
  fitness_goal: FitnessGoal | null;
  experience_level: Difficulty | null;
  weekly_workout_goal: number;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferences = {
  user_id: string;
  theme: 'dark' | 'light' | 'system';
  weight_unit: 'kg' | 'lb';
  length_unit: 'cm' | 'in';
  notifications_enabled: boolean;
  reminder_time: string | null;
  reminder_weekdays: number[];
  default_rest_seconds: number;
  avatar_style: AvatarStyle;
  created_at: string;
  updated_at: string;
};

export type AvatarStyle = {
  base?: 'feminine' | 'masculine' | 'neutral';
  skin?: string;
  outfit?: string;
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: string;
  difficulty: Difficulty;
  description: string;
  instructions: string[];
  tips: string[];
  recommended_sets: number | null;
  recommended_reps: string | null;
  media_key: string | null;
  media_url: string | null;
  is_timed: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutPlan = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  muscle_groups: MuscleGroup[];
  color: string | null;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutPlanExercise = {
  id: string;
  plan_id: string;
  user_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number | null;
  rest_seconds: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  plan_id: string | null;
  name: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  total_paused_seconds: number;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutSessionExercise = {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  plan_exercise_id: string | null;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  rest_seconds: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutSet = {
  id: string;
  session_exercise_id: string;
  user_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  duration_seconds: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BodyMetric = {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  waist_cm: number | null;
  arm_cm: number | null;
  chest_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserGoal = {
  id: string;
  user_id: string;
  type: GoalType;
  title: string;
  target_value: number | null;
  start_value: number | null;
  unit: string | null;
  exercise_id: string | null;
  deadline: string | null;
  status: GoalStatus;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseFavorite = { user_id: string; exercise_id: string; created_at: string };

export type WorkoutSessionStats = {
  session_id: string;
  user_id: string;
  plan_id: string | null;
  name: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  exercise_count: number;
  completed_sets: number;
  total_reps: number;
  total_volume_kg: number;
};

export type ExerciseSessionProgress = {
  user_id: string;
  exercise_id: string;
  session_id: string;
  started_at: string;
  sets: number;
  total_reps: number;
  max_weight_kg: number;
  volume_kg: number;
  estimated_1rm_kg: number;
};

export type PreviousSet = {
  session_id: string;
  started_at: string;
  set_number: number;
  reps: number;
  weight_kg: number;
};

/** Torna opcionais as colunas com valor padrão no banco. */
type Insertable<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;
type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

type Auto = 'created_at' | 'updated_at';

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        Insertable<
          Profile,
          | Auto
          | 'avatar_path'
          | 'birth_date'
          | 'sex'
          | 'fitness_goal'
          | 'experience_level'
          | 'weekly_workout_goal'
          | 'terms_accepted_at'
        >
      >;
      user_preferences: Table<
        UserPreferences,
        Insertable<UserPreferences, Exclude<keyof UserPreferences, 'user_id'>>
      >;
      exercises: Table<Exercise, Insertable<Exercise, Auto | 'id'>>;
      exercise_favorites: Table<
        ExerciseFavorite,
        Insertable<ExerciseFavorite, 'user_id' | 'created_at'>
      >;
      workout_plans: Table<
        WorkoutPlan,
        Insertable<
          WorkoutPlan,
          | Auto
          | 'id'
          | 'user_id'
          | 'description'
          | 'muscle_groups'
          | 'color'
          | 'position'
          | 'archived_at'
        >
      >;
      workout_plan_exercises: Table<
        WorkoutPlanExercise,
        Insertable<
          WorkoutPlanExercise,
          | Auto
          | 'id'
          | 'user_id'
          | 'target_sets'
          | 'target_reps'
          | 'target_weight_kg'
          | 'rest_seconds'
          | 'notes'
        >
      >;
      workout_sessions: Table<
        WorkoutSession,
        Insertable<
          WorkoutSession,
          | Auto
          | 'id'
          | 'user_id'
          | 'plan_id'
          | 'status'
          | 'started_at'
          | 'ended_at'
          | 'paused_at'
          | 'total_paused_seconds'
          | 'duration_seconds'
          | 'notes'
        >
      >;
      workout_session_exercises: Table<
        WorkoutSessionExercise,
        Insertable<
          WorkoutSessionExercise,
          | Auto
          | 'id'
          | 'user_id'
          | 'plan_exercise_id'
          | 'position'
          | 'target_sets'
          | 'target_reps'
          | 'target_weight_kg'
          | 'rest_seconds'
          | 'notes'
        >
      >;
      workout_sets: Table<
        WorkoutSet,
        Insertable<
          WorkoutSet,
          | Auto
          | 'id'
          | 'user_id'
          | 'reps'
          | 'weight_kg'
          | 'duration_seconds'
          | 'completed'
          | 'completed_at'
        >
      >;
      body_metrics: Table<BodyMetric, Insertable<BodyMetric, Exclude<keyof BodyMetric, never>>>;
      user_goals: Table<
        UserGoal,
        Insertable<
          UserGoal,
          | Auto
          | 'id'
          | 'user_id'
          | 'target_value'
          | 'start_value'
          | 'unit'
          | 'exercise_id'
          | 'deadline'
          | 'status'
          | 'achieved_at'
        >
      >;
    };
    Views: {
      workout_session_stats: { Row: WorkoutSessionStats; Relationships: [] };
      exercise_session_progress: { Row: ExerciseSessionProgress; Relationships: [] };
    };
    Functions: {
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      reorder_plan_exercises: { Args: { p_plan_id: string; p_ids: string[] }; Returns: undefined };
      duplicate_workout_plan: {
        Args: { p_plan_id: string; p_name?: string | null };
        Returns: string;
      };
      previous_sets: {
        Args: { p_exercise_id: string; p_exclude_session?: string | null };
        Returns: PreviousSet[];
      };
    };
    Enums: {
      muscle_group: MuscleGroup;
      difficulty_level: Difficulty;
      session_status: SessionStatus;
      goal_type: GoalType;
      goal_status: GoalStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
