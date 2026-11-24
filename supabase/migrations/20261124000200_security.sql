-- =============================================================================
-- FitTrack — Row Level Security
-- Cada usuário só enxerga e altera os próprios dados.
-- O catálogo de exercícios é público para leitura e só pode ser alterado com a
-- chave service_role (que fica apenas no servidor / painel do Supabase).
-- =============================================================================

alter table public.profiles                  enable row level security;
alter table public.user_preferences          enable row level security;
alter table public.exercises                 enable row level security;
alter table public.exercise_favorites        enable row level security;
alter table public.workout_plans             enable row level security;
alter table public.workout_plan_exercises    enable row level security;
alter table public.workout_sessions          enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_sets              enable row level security;
alter table public.body_metrics              enable row level security;
alter table public.user_goals                enable row level security;

-- Remove privilégios amplos padrão; concede somente o necessário.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.exercises to anon, authenticated;
grant select, insert, update, delete on
  public.user_preferences,
  public.exercise_favorites,
  public.workout_plans,
  public.workout_plan_exercises,
  public.workout_sessions,
  public.workout_session_exercises,
  public.workout_sets,
  public.body_metrics,
  public.user_goals
to authenticated;
-- O perfil é criado pelo gatilho de cadastro; o usuário só lê e atualiza.
grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------
create policy "Catálogo de exercícios é público"
  on public.exercises for select
  to anon, authenticated
  using (true);
-- Sem políticas de insert/update/delete: somente service_role (ignora RLS).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "Usuário lê o próprio perfil"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Usuário atualiza o próprio perfil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Tabelas com user_id: política única "dono"
-- ---------------------------------------------------------------------------
create policy "Dono gerencia preferências"
  on public.user_preferences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Dono gerencia favoritos"
  on public.exercise_favorites for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Dono gerencia planos"
  on public.workout_plans for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- A FK composta (plan_id, user_id) já impede apontar para plano de outra pessoa.
create policy "Dono gerencia exercícios do plano"
  on public.workout_plan_exercises for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Dono gerencia sessões"
  on public.workout_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      plan_id is null
      or exists (select 1 from public.workout_plans p
                 where p.id = plan_id and p.user_id = (select auth.uid()))
    )
  );

create policy "Dono gerencia exercícios da sessão"
  on public.workout_session_exercises for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      plan_exercise_id is null
      or exists (select 1 from public.workout_plan_exercises pe
                 where pe.id = plan_exercise_id and pe.user_id = (select auth.uid()))
    )
  );

create policy "Dono gerencia séries"
  on public.workout_sets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Dono gerencia métricas corporais"
  on public.body_metrics for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Dono gerencia objetivos"
  on public.user_goals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
