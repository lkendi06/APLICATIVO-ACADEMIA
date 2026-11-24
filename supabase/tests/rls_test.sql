-- =============================================================================
-- Testes de segurança (RLS) e regras do banco do FitTrack.
-- Executado por supabase/tests/run-local.sh contra um PostgreSQL limpo.
-- Qualquer falha interrompe a execução com erro (ON_ERROR_STOP).
-- =============================================================================
\set ON_ERROR_STOP 1
\set QUIET 1

create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

create or replace function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
end $$;

-- Usuários de teste (como o Supabase Auth faria)
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.dev',
   '{"full_name":"Ana Teste","terms_accepted_at":"2026-11-24T00:00:00Z"}'),
  ('22222222-2222-2222-2222-222222222222', 'bruno@teste.dev', '{"full_name":"Bruno Teste"}');

select pg_temp.assert((select count(*) from public.profiles) = 2, 'gatilho cria perfil para cada usuário');
select pg_temp.assert((select count(*) from public.user_preferences) = 2, 'gatilho cria preferências');
select pg_temp.assert((select theme from public.user_preferences
                       where user_id = '11111111-1111-1111-1111-111111111111') = 'dark',
                      'tema escuro é o padrão');
select pg_temp.assert((select terms_accepted_at is not null from public.profiles
                       where id = '11111111-1111-1111-1111-111111111111'), 'aceite dos termos salvo');
select pg_temp.assert((select count(*) from public.exercises) >= 28, 'seed carregou o catálogo');

-- ---------------------------------------------------------------------------
-- Anônimo
-- ---------------------------------------------------------------------------
set role anon;
select pg_temp.login(null);
select pg_temp.assert((select count(*) from public.exercises) >= 28, 'anônimo lê o catálogo');
do $$ begin
  perform 1 from public.profiles;
  raise exception 'FALHOU: anônimo não deveria ler perfis';
exception when insufficient_privilege then raise notice 'ok - anônimo não lê perfis';
end $$;
do $$ begin
  insert into public.exercises (slug, name, primary_muscle, equipment, description, instructions)
  values ('hack', 'Hack', 'chest', 'x', 'x', array['x']);
  raise exception 'FALHOU: anônimo não deveria inserir exercícios';
exception when insufficient_privilege then raise notice 'ok - anônimo não altera o catálogo';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- Ana cria dados
-- ---------------------------------------------------------------------------
set role authenticated;
select pg_temp.login('11111111-1111-1111-1111-111111111111');

do $$ begin
  insert into public.exercises (slug, name, primary_muscle, equipment, description, instructions)
  values ('hack', 'Hack', 'chest', 'x', 'x', array['x']);
  raise exception 'FALHOU: usuário comum não deveria inserir exercícios';
exception when insufficient_privilege then raise notice 'ok - usuário comum não altera o catálogo';
end $$;

insert into public.workout_plans (id, name, muscle_groups)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Treino A — Peito e tríceps', '{chest,triceps}');
insert into public.workout_plan_exercises (id, plan_id, exercise_id, position, target_sets, target_reps, target_weight_kg)
select 'aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000001', id, 0, 3, 12, 20
  from public.exercises where slug = 'supino-reto';
insert into public.workout_plan_exercises (id, plan_id, exercise_id, position)
select 'aaaaaaaa-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-000000000001', id, 1
  from public.exercises where slug = 'triceps-polia';

select public.reorder_plan_exercises('aaaaaaaa-0000-0000-0000-000000000001',
  array['aaaaaaaa-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-0000000000e1']::uuid[]);
select pg_temp.assert((select position from public.workout_plan_exercises
                       where id = 'aaaaaaaa-0000-0000-0000-0000000000e2') = 0, 'reordenar exercícios do plano');

select pg_temp.assert(public.duplicate_workout_plan('aaaaaaaa-0000-0000-0000-000000000001') is not null,
                      'duplicar plano');
select pg_temp.assert((select count(*) from public.workout_plan_exercises) = 4, 'cópia inclui exercícios');

-- Sessão de treino com séries (exemplo do supino: 12x20, 10x25, 8x30)
insert into public.workout_sessions (id, plan_id, name, started_at)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Treino A',
        now() - interval '1 hour');

do $$ begin
  insert into public.workout_sessions (name) values ('Segundo treino ativo');
  raise exception 'FALHOU: não deveria haver dois treinos ativos';
exception when unique_violation then raise notice 'ok - apenas um treino em andamento por usuário';
end $$;

insert into public.workout_session_exercises (id, session_id, exercise_id, position)
select 'cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', id, 0
  from public.exercises where slug = 'supino-reto';
insert into public.workout_sets (id, session_exercise_id, set_number, reps, weight_kg, completed, completed_at) values
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 1, 12, 20, true, now()),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 2, 10, 25, true, now()),
  ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 3, 8, 30, true, now());

-- Reenvio da mesma série (sincronização offline) não duplica: upsert pelo id
insert into public.workout_sets (id, session_exercise_id, set_number, reps, weight_kg, completed)
values ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 3, 8, 30, true)
on conflict (id) do update set reps = excluded.reps;
select pg_temp.assert((select count(*) from public.workout_sets) = 3, 'upsert idempotente não duplica séries');

do $$ begin
  insert into public.workout_sets (session_exercise_id, set_number, reps, weight_kg)
  values ('cccccccc-0000-0000-0000-000000000001', 4, -1, 10);
  raise exception 'FALHOU: repetições negativas deveriam ser rejeitadas';
exception when check_violation then raise notice 'ok - validação de repetições';
end $$;

update public.workout_sessions set status = 'completed' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select pg_temp.assert((select duration_seconds between 3590 and 3610 from public.workout_sessions
                       where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'duração calculada ao finalizar');

select pg_temp.assert((select total_volume_kg from public.workout_session_stats
                       where session_id = 'bbbbbbbb-0000-0000-0000-000000000001') = 730,
                      'volume total = 12x20 + 10x25 + 8x30 = 730 kg');
select pg_temp.assert((select total_reps from public.workout_session_stats
                       where session_id = 'bbbbbbbb-0000-0000-0000-000000000001') = 30, 'total de repetições = 30');
select pg_temp.assert((select count(*) from public.previous_sets(
                         (select id from public.exercises where slug = 'supino-reto'))) = 3,
                      'séries anteriores para comparação');
select pg_temp.assert((select max_weight_kg from public.exercise_session_progress limit 1) = 30,
                      'progresso por exercício (carga máxima)');

insert into public.body_metrics (weight_kg, height_cm, measured_at) values (82, 180, now() - interval '30 days');
insert into public.body_metrics (weight_kg, measured_at) values (80, now());
select pg_temp.assert((select count(*) from public.body_metrics) = 2, 'métricas preservam o histórico');
do $$ begin
  insert into public.body_metrics (notes) values ('vazio');
  raise exception 'FALHOU: métrica vazia deveria ser rejeitada';
exception when check_violation then raise notice 'ok - métrica precisa de ao menos uma medida';
end $$;

insert into public.user_goals (type, title, target_value, unit) values ('target_weight', 'Chegar a 78 kg', 78, 'kg');
insert into public.exercise_favorites (exercise_id) select id from public.exercises where slug = 'agachamento-livre';

-- Storage: só a própria pasta
insert into storage.objects (bucket_id, name) values ('avatars', '11111111-1111-1111-1111-111111111111/avatar.jpg');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('avatars', '22222222-2222-2222-2222-222222222222/avatar.jpg');
  raise exception 'FALHOU: não deveria enviar avatar na pasta de outro usuário';
exception when insufficient_privilege then raise notice 'ok - avatar só na própria pasta';
end $$;

-- ---------------------------------------------------------------------------
-- Bruno não enxerga nem altera nada da Ana
-- ---------------------------------------------------------------------------
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select pg_temp.assert((select count(*) from public.profiles) = 1, 'Bruno vê apenas o próprio perfil');
select pg_temp.assert((select count(*) from public.workout_plans) = 0, 'Bruno não vê planos da Ana');
select pg_temp.assert((select count(*) from public.workout_plan_exercises) = 0, 'Bruno não vê exercícios do plano da Ana');
select pg_temp.assert((select count(*) from public.workout_sessions) = 0, 'Bruno não vê sessões da Ana');
select pg_temp.assert((select count(*) from public.workout_sets) = 0, 'Bruno não vê séries da Ana');
select pg_temp.assert((select count(*) from public.workout_session_stats) = 0, 'visão de estatísticas respeita RLS');
select pg_temp.assert((select count(*) from public.exercise_session_progress) = 0, 'visão de progresso respeita RLS');
select pg_temp.assert((select count(*) from public.body_metrics) = 0, 'Bruno não vê métricas da Ana');
select pg_temp.assert((select count(*) from public.user_goals) = 0, 'Bruno não vê objetivos da Ana');
select pg_temp.assert((select count(*) from public.exercise_favorites) = 0, 'Bruno não vê favoritos da Ana');
select pg_temp.assert((select count(*) from storage.objects) = 0, 'Bruno não vê o avatar da Ana');

update public.workout_sets set reps = 99;
update public.profiles set full_name = 'Hacker' where id = '11111111-1111-1111-1111-111111111111';
delete from public.body_metrics;

do $$ begin
  insert into public.workout_plan_exercises (plan_id, user_id, exercise_id, position)
  select 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', id, 9
    from public.exercises limit 1;
  raise exception 'FALHOU: Bruno não deveria inserir exercício no plano da Ana';
exception when foreign_key_violation then raise notice 'ok - não insere em plano alheio (FK composta)';
end $$;

do $$ begin
  insert into public.workout_sessions (plan_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x');
  raise exception 'FALHOU: Bruno não deveria iniciar sessão com plano da Ana';
exception when insufficient_privilege then raise notice 'ok - não usa plano alheio em sessão';
end $$;

do $$ begin
  insert into public.workout_plans (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'invasão');
  raise exception 'FALHOU: Bruno não deveria criar plano em nome da Ana';
exception when insufficient_privilege then raise notice 'ok - não cria dados em nome de outro usuário';
end $$;

do $$ begin
  perform public.duplicate_workout_plan('aaaaaaaa-0000-0000-0000-000000000001');
  raise exception 'FALHOU: Bruno não deveria duplicar plano da Ana';
exception when no_data_found then raise notice 'ok - não duplica plano alheio';
end $$;

reset role;
select pg_temp.assert((select reps from public.workout_sets where id = 'dddddddd-0000-0000-0000-000000000001') = 12,
                      'séries da Ana intactas após tentativa de alteração');
select pg_temp.assert((select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'Ana Teste',
                      'perfil da Ana intacto');
select pg_temp.assert((select count(*) from public.body_metrics) = 2, 'métricas da Ana intactas');

-- ---------------------------------------------------------------------------
-- Exclusão de conta remove tudo em cascata
-- ---------------------------------------------------------------------------
set role authenticated;
select pg_temp.login('11111111-1111-1111-1111-111111111111');
select public.delete_my_account();
reset role;
select pg_temp.assert((select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111') = 0,
                      'conta excluída');
select pg_temp.assert((select count(*) from public.workout_sets) = 0
                      and (select count(*) from public.body_metrics) = 0
                      and (select count(*) from public.workout_plans) = 0, 'dados removidos em cascata');
select pg_temp.assert((select count(*) from public.profiles) = 1, 'conta do Bruno preservada');

\echo 'TODOS OS TESTES DE BANCO PASSARAM'
