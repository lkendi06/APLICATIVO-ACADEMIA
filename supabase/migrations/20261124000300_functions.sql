-- =============================================================================
-- FitTrack — funções, gatilhos de cadastro e visões de estatística
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Cadastro: cria perfil e preferências automaticamente para cada novo usuário.
-- Os metadados vêm de supabase.auth.signUp({ options: { data: {...} } }).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_terms timestamptz;
begin
  begin
    v_terms := (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz;
  exception when others then
    v_terms := null;
  end;

  insert into public.profiles (id, full_name, terms_accepted_at)
  values (
    new.id,
    left(coalesce(v_name, split_part(coalesce(new.email, 'Atleta'), '@', 1), 'Atleta'), 120),
    v_terms
  );
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Exclusão de conta: remove o usuário autenticado (e, em cascata, todos os dados).
-- Arquivos no Storage são removidos pelo app antes de chamar esta função.
-- -----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- -----------------------------------------------------------------------------
-- Reordenar exercícios de um plano em uma única transação.
-- -----------------------------------------------------------------------------
create or replace function public.reorder_plan_exercises(p_plan_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.workout_plans
                 where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'Plano não encontrado' using errcode = 'P0002';
  end if;

  update public.workout_plan_exercises e
     set position = o.ord - 1
    from unnest(p_ids) with ordinality as o(id, ord)
   where e.id = o.id and e.plan_id = p_plan_id;
end;
$$;

grant execute on function public.reorder_plan_exercises(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Duplicar um plano com todos os exercícios.
-- -----------------------------------------------------------------------------
create or replace function public.duplicate_workout_plan(p_plan_id uuid, p_name text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new uuid;
  v_uid uuid := auth.uid();
begin
  insert into public.workout_plans (user_id, name, description, muscle_groups, color, position)
  select v_uid,
         left(coalesce(nullif(btrim(p_name), ''), name || ' (cópia)'), 80),
         description, muscle_groups, color,
         (select coalesce(max(position), 0) + 1 from public.workout_plans where user_id = v_uid)
    from public.workout_plans
   where id = p_plan_id and user_id = v_uid
  returning id into v_new;

  if v_new is null then
    raise exception 'Plano não encontrado' using errcode = 'P0002';
  end if;

  insert into public.workout_plan_exercises
    (plan_id, user_id, exercise_id, position, target_sets, target_reps, target_weight_kg, rest_seconds, notes)
  select v_new, v_uid, exercise_id, position, target_sets, target_reps, target_weight_kg, rest_seconds, notes
    from public.workout_plan_exercises
   where plan_id = p_plan_id and user_id = v_uid;

  return v_new;
end;
$$;

grant execute on function public.duplicate_workout_plan(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Visões de estatística (security_invoker: respeitam a RLS de quem consulta)
-- -----------------------------------------------------------------------------
create or replace view public.workout_session_stats
with (security_invoker = true) as
select
  s.id                as session_id,
  s.user_id,
  s.plan_id,
  s.name,
  s.status,
  s.started_at,
  s.ended_at,
  s.duration_seconds,
  count(distinct se.id)                                         as exercise_count,
  count(ws.id) filter (where ws.completed)                       as completed_sets,
  coalesce(sum(ws.reps) filter (where ws.completed), 0)::bigint as total_reps,
  coalesce(sum(ws.reps * ws.weight_kg) filter (where ws.completed), 0)::numeric(12,2) as total_volume_kg
from public.workout_sessions s
left join public.workout_session_exercises se on se.session_id = s.id
left join public.workout_sets ws on ws.session_exercise_id = se.id
group by s.id;

grant select on public.workout_session_stats to authenticated;

-- Desempenho por exercício em cada sessão concluída (histórico de cargas e repetições).
create or replace view public.exercise_session_progress
with (security_invoker = true) as
select
  se.user_id,
  se.exercise_id,
  s.id                as session_id,
  s.started_at,
  count(ws.id)                                   as sets,
  coalesce(sum(ws.reps), 0)::bigint              as total_reps,
  coalesce(max(ws.weight_kg), 0)                 as max_weight_kg,
  coalesce(sum(ws.reps * ws.weight_kg), 0)::numeric(12,2) as volume_kg,
  -- 1RM estimado (fórmula de Epley), só para séries de até 12 repetições
  coalesce(max(ws.weight_kg * (1 + ws.reps / 30.0)) filter (where ws.reps between 1 and 12), 0)::numeric(8,2)
                                                 as estimated_1rm_kg
from public.workout_session_exercises se
join public.workout_sessions s on s.id = se.session_id and s.status = 'completed'
join public.workout_sets ws on ws.session_exercise_id = se.id and ws.completed
group by se.user_id, se.exercise_id, s.id, s.started_at;

grant select on public.exercise_session_progress to authenticated;

-- Séries da última sessão concluída que contém o exercício (para comparação ao vivo).
create or replace function public.previous_sets(p_exercise_id uuid, p_exclude_session uuid default null)
returns table (session_id uuid, started_at timestamptz, set_number smallint, reps smallint, weight_kg numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with last_session as (
    select s.id, s.started_at
      from public.workout_sessions s
      join public.workout_session_exercises se on se.session_id = s.id
     where s.user_id = auth.uid()
       and s.status = 'completed'
       and se.exercise_id = p_exercise_id
       and (p_exclude_session is null or s.id <> p_exclude_session)
     order by s.started_at desc
     limit 1
  )
  select ls.id, ls.started_at, ws.set_number, ws.reps, ws.weight_kg
    from last_session ls
    join public.workout_session_exercises se on se.session_id = ls.id and se.exercise_id = p_exercise_id
    join public.workout_sets ws on ws.session_exercise_id = se.id and ws.completed
   order by ws.set_number;
$$;

grant execute on function public.previous_sets(uuid, uuid) to authenticated;
