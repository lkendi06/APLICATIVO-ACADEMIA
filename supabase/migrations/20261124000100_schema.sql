-- =============================================================================
-- FitTrack — esquema principal
-- =============================================================================
-- Convenções:
--   * Toda tabela de dados do usuário tem `user_id` (dono) para RLS simples e rápida.
--   * Tabelas filhas usam chave estrangeira composta (pai_id, user_id) para garantir
--     que o filho pertence ao mesmo dono do pai.
--   * IDs são UUID. Registros de treino aceitam IDs gerados no app (idempotência
--     para sincronização offline e prevenção de duplicados).
--   * created_at/updated_at em todas as tabelas, com gatilho de atualização.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'
);

create type public.difficulty_level as enum ('beginner', 'intermediate', 'advanced');

create type public.session_status as enum ('active', 'completed');

create type public.goal_type as enum (
  'target_weight', 'weekly_workouts', 'body_fat', 'exercise_load', 'custom'
);

create type public.goal_status as enum ('active', 'achieved', 'archived');

-- -----------------------------------------------------------------------------
-- Função utilitária: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null check (char_length(btrim(full_name)) between 2 and 120),
  avatar_path        text check (avatar_path is null or char_length(avatar_path) <= 300),
  birth_date         date check (birth_date is null or (birth_date > date '1900-01-01' and birth_date <= current_date)),
  sex                text check (sex is null or sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  fitness_goal       text check (fitness_goal is null or fitness_goal in
                       ('lose_weight', 'gain_muscle', 'maintain', 'endurance', 'health')),
  experience_level   public.difficulty_level,
  weekly_workout_goal smallint not null default 3 check (weekly_workout_goal between 1 and 14),
  terms_accepted_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.profiles is 'Dados de perfil de cada usuário (1:1 com auth.users).';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_preferences
-- -----------------------------------------------------------------------------
create table public.user_preferences (
  user_id                  uuid primary key references public.profiles (id) on delete cascade,
  theme                    text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  weight_unit              text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  length_unit              text not null default 'cm' check (length_unit in ('cm', 'in')),
  notifications_enabled    boolean not null default false,
  reminder_time            time,
  reminder_weekdays        smallint[] not null default '{}'
                             check (reminder_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  default_rest_seconds     integer not null default 90 check (default_rest_seconds between 10 and 900),
  avatar_style             jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- exercises (catálogo global)
-- -----------------------------------------------------------------------------
create table public.exercises (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name               text not null check (char_length(name) between 2 and 120),
  primary_muscle     public.muscle_group not null,
  secondary_muscles  public.muscle_group[] not null default '{}',
  equipment          text not null,
  difficulty         public.difficulty_level not null default 'beginner',
  description        text not null,
  instructions       text[] not null check (cardinality(instructions) > 0),
  tips               text[] not null default '{}',
  recommended_sets   smallint check (recommended_sets is null or recommended_sets between 1 and 10),
  recommended_reps   text,
  media_key          text,          -- chave do GIF empacotado no app (assets/exercises)
  media_url          text,          -- URL opcional (Supabase Storage) para mídias novas
  is_timed           boolean not null default false, -- ex.: prancha (registro em segundos)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index exercises_primary_muscle_idx on public.exercises (primary_muscle);
create index exercises_name_idx on public.exercises using btree (lower(name));

create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- exercise_favorites
-- -----------------------------------------------------------------------------
create table public.exercise_favorites (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index exercise_favorites_exercise_idx on public.exercise_favorites (exercise_id);

-- -----------------------------------------------------------------------------
-- workout_plans
-- -----------------------------------------------------------------------------
create table public.workout_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 80),
  description    text check (description is null or char_length(description) <= 500),
  muscle_groups  public.muscle_group[] not null default '{}',
  color          text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  position       integer not null default 0,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id)
);

create index workout_plans_user_idx on public.workout_plans (user_id, position);

create trigger workout_plans_updated_at before update on public.workout_plans
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- workout_plan_exercises
-- -----------------------------------------------------------------------------
create table public.workout_plan_exercises (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null,
  user_id           uuid not null default auth.uid(),
  exercise_id       uuid not null references public.exercises (id) on delete restrict,
  position          integer not null check (position >= 0),
  target_sets       smallint not null default 3 check (target_sets between 1 and 20),
  target_reps       smallint not null default 10 check (target_reps between 1 and 100),
  target_weight_kg  numeric(6,2) check (target_weight_kg is null or target_weight_kg between 0 and 1000),
  rest_seconds      integer not null default 90 check (rest_seconds between 0 and 900),
  notes             text check (notes is null or char_length(notes) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (plan_id, user_id) references public.workout_plans (id, user_id) on delete cascade,
  constraint workout_plan_exercises_position_uniq unique (plan_id, position) deferrable initially deferred
);

create index workout_plan_exercises_plan_idx on public.workout_plan_exercises (plan_id, position);
create index workout_plan_exercises_user_idx on public.workout_plan_exercises (user_id);
create index workout_plan_exercises_exercise_idx on public.workout_plan_exercises (exercise_id);

create trigger workout_plan_exercises_updated_at before update on public.workout_plan_exercises
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- workout_sessions
-- -----------------------------------------------------------------------------
create table public.workout_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id               uuid references public.workout_plans (id) on delete set null,
  name                  text not null check (char_length(btrim(name)) between 1 and 80),
  status                public.session_status not null default 'active',
  started_at            timestamptz not null default now(),
  ended_at              timestamptz,
  paused_at             timestamptz,
  total_paused_seconds  integer not null default 0 check (total_paused_seconds >= 0),
  duration_seconds      integer check (duration_seconds is null or duration_seconds >= 0),
  notes                 text check (notes is null or char_length(notes) <= 1000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  check (ended_at is null or ended_at >= started_at),
  check (status = 'active' or ended_at is not null)
);

-- No máximo um treino em andamento por usuário (recuperação de sessão).
create unique index workout_sessions_one_active_per_user
  on public.workout_sessions (user_id) where status = 'active';
create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index workout_sessions_plan_idx on public.workout_sessions (plan_id);

create trigger workout_sessions_updated_at before update on public.workout_sessions
  for each row execute function public.set_updated_at();

-- Calcula a duração ao finalizar o treino.
create or replace function public.workout_sessions_on_complete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    if new.ended_at is null then
      new.ended_at := now();
    end if;
    if new.paused_at is not null then
      new.total_paused_seconds := new.total_paused_seconds
        + greatest(0, extract(epoch from (new.ended_at - new.paused_at))::integer);
      new.paused_at := null;
    end if;
    new.duration_seconds := greatest(
      0,
      extract(epoch from (new.ended_at - new.started_at))::integer - new.total_paused_seconds
    );
  end if;
  return new;
end;
$$;

create trigger workout_sessions_complete before insert or update on public.workout_sessions
  for each row execute function public.workout_sessions_on_complete();

-- -----------------------------------------------------------------------------
-- workout_session_exercises
-- -----------------------------------------------------------------------------
create table public.workout_session_exercises (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null,
  user_id           uuid not null default auth.uid(),
  exercise_id       uuid not null references public.exercises (id) on delete restrict,
  plan_exercise_id  uuid references public.workout_plan_exercises (id) on delete set null,
  position          integer not null default 0 check (position >= 0),
  target_sets       smallint check (target_sets is null or target_sets between 1 and 20),
  target_reps       smallint check (target_reps is null or target_reps between 1 and 100),
  target_weight_kg  numeric(6,2) check (target_weight_kg is null or target_weight_kg between 0 and 1000),
  rest_seconds      integer not null default 90 check (rest_seconds between 0 and 900),
  notes             text check (notes is null or char_length(notes) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade
);

create index workout_session_exercises_session_idx on public.workout_session_exercises (session_id, position);
create index workout_session_exercises_user_exercise_idx on public.workout_session_exercises (user_id, exercise_id);

create trigger workout_session_exercises_updated_at before update on public.workout_session_exercises
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- workout_sets
-- -----------------------------------------------------------------------------
create table public.workout_sets (
  id                    uuid primary key default gen_random_uuid(),
  session_exercise_id   uuid not null,
  user_id               uuid not null default auth.uid(),
  set_number            smallint not null check (set_number between 1 and 100),
  reps                  smallint not null default 0 check (reps between 0 and 1000),
  weight_kg             numeric(6,2) not null default 0 check (weight_kg between 0 and 1000),
  duration_seconds      integer check (duration_seconds is null or duration_seconds between 0 and 36000),
  completed             boolean not null default false,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (session_exercise_id, user_id)
    references public.workout_session_exercises (id, user_id) on delete cascade
);

create index workout_sets_session_exercise_idx on public.workout_sets (session_exercise_id, set_number);
create index workout_sets_user_idx on public.workout_sets (user_id, completed_at desc);

create trigger workout_sets_updated_at before update on public.workout_sets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- body_metrics (histórico — cada medição é um novo registro)
-- -----------------------------------------------------------------------------
create table public.body_metrics (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  measured_at    timestamptz not null default now(),
  weight_kg      numeric(5,2) check (weight_kg is null or weight_kg between 20 and 400),
  height_cm      numeric(5,1) check (height_cm is null or height_cm between 50 and 260),
  waist_cm       numeric(5,1) check (waist_cm is null or waist_cm between 20 and 300),
  arm_cm         numeric(5,1) check (arm_cm is null or arm_cm between 10 and 120),
  chest_cm       numeric(5,1) check (chest_cm is null or chest_cm between 30 and 300),
  hip_cm         numeric(5,1) check (hip_cm is null or hip_cm between 30 and 300),
  thigh_cm       numeric(5,1) check (thigh_cm is null or thigh_cm between 15 and 150),
  body_fat_pct   numeric(4,1) check (body_fat_pct is null or body_fat_pct between 2 and 75),
  notes          text check (notes is null or char_length(notes) <= 500),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (
    coalesce(weight_kg, height_cm, waist_cm, arm_cm, chest_cm, hip_cm, thigh_cm, body_fat_pct) is not null
  )
);

create index body_metrics_user_measured_idx on public.body_metrics (user_id, measured_at desc);

create trigger body_metrics_updated_at before update on public.body_metrics
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_goals
-- -----------------------------------------------------------------------------
create table public.user_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  type           public.goal_type not null,
  title          text not null check (char_length(btrim(title)) between 1 and 120),
  target_value   numeric(8,2) check (target_value is null or target_value >= 0),
  start_value    numeric(8,2) check (start_value is null or start_value >= 0),
  unit           text check (unit is null or char_length(unit) <= 16),
  exercise_id    uuid references public.exercises (id) on delete set null,
  deadline       date,
  status         public.goal_status not null default 'active',
  achieved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index user_goals_user_idx on public.user_goals (user_id, status);

create trigger user_goals_updated_at before update on public.user_goals
  for each row execute function public.set_updated_at();
