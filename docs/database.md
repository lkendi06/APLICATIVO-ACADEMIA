# Banco de dados

Postgres do Supabase. Migrations em `supabase/migrations` (rodar em ordem):

| Arquivo                 | O que faz                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `…000100_schema.sql`    | Tipos, tabelas, índices, triggers de `updated_at` e de duração                                    |
| `…000200_security.sql`  | RLS em todas as tabelas, `grant`s mínimos e políticas por dono                                    |
| `…000300_functions.sql` | Criação de perfil no cadastro, exclusão de conta, duplicar/reordenar treino, views de estatística |
| `…000400_storage.sql`   | Buckets `avatars` (privado, 5 MB, pasta por usuário) e `exercise-media` (leitura pública)         |

`supabase/seed.sql` insere 28 exercícios (upsert por `slug`, pode rodar de novo).

## Tabelas

| Tabela                      | Descrição                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`                  | Nome, foto, nascimento, sexo, objetivo, nível, meta semanal, aceite dos termos                                                       |
| `user_preferences`          | Tema, unidades, lembretes, descanso padrão, estilo do avatar                                                                         |
| `exercises`                 | Catálogo público (somente leitura para usuários)                                                                                     |
| `exercise_favorites`        | Favoritos por usuário                                                                                                                |
| `workout_plans`             | Treinos (fichas) do usuário                                                                                                          |
| `workout_plan_exercises`    | Exercícios de cada treino, com séries/reps/carga/descanso e posição                                                                  |
| `workout_sessions`          | Sessões realizadas (`active` ou `completed`), pausas e duração                                                                       |
| `workout_session_exercises` | Exercícios da sessão                                                                                                                 |
| `workout_sets`              | Cada série: reps, carga, duração, concluída                                                                                          |
| `body_metrics`              | Medições com data/hora (peso, altura, cintura, braço, peito, quadril, coxa, % gordura). Nunca sobrescritas: cada medição é uma linha |
| `user_goals`                | Objetivos (peso-alvo, treinos/semana, gordura, carga, personalizado)                                                                 |

## Segurança (RLS)

- `anon` e `authenticated` começam sem permissão (`revoke all`); só recebem o necessário.
- Cada tabela do usuário tem política `user_id = (select auth.uid())`.
- Chaves estrangeiras compostas `(parent_id, user_id)` impedem ligar um registro seu a um
  registro de outra pessoa.
- `exercises` é leitura pública, sem escrita pelo app.
- `delete_my_account()` apaga o usuário de `auth.users`; o resto sai em cascata.

## Testes

`supabase/tests/rls_test.sql` cria duas contas (Ana e Bruno) e verifica 44 regras:
isolamento entre usuários, tentativas de leitura/alteração cruzada, cascata na exclusão,
volume calculado, um treino ativo por usuário etc.

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
```

O script cria um banco `fittrack_test`, aplica `stubs.sql` (simula `auth` e `storage` do
Supabase), as migrations e o seed. Roda também no GitHub Actions.

## Tipos TypeScript

`src/types/database.ts` foi escrito à mão espelhando o schema. Para gerar automaticamente:

```bash
npx supabase gen types typescript --project-id <id> > src/types/supabase.ts
```
