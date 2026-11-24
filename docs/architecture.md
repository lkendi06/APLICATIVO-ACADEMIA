# Arquitetura

## Visão geral

```
App (Expo / React Native)
 ├─ Expo Router (src/app)        → telas e navegação por arquivos
 ├─ TanStack Query (src/hooks)   → cache de dados do servidor
 ├─ Serviços (src/services)      → acesso ao Supabase, fila offline, treino ativo
 └─ Supabase JS                  → Auth (PKCE), Postgres (RLS), Storage
                      │
                      ▼
Supabase (Postgres + Auth + Storage)
 ├─ supabase/migrations          → schema, RLS, funções, buckets
 └─ supabase/seed.sql            → 28 exercícios em pt-BR
```

O app fala direto com o Supabase usando apenas a chave **pública** (anon / publishable).
Toda a segurança dos dados fica no banco, com **Row Level Security** em todas as tabelas.
Não há servidor próprio nem Edge Functions: as operações sensíveis (excluir conta,
duplicar/reordenar treinos) são funções SQL `security definer` ou `security invoker`
com verificação de dono.

## Pastas

| Pasta              | Conteúdo                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/app`          | Rotas do Expo Router. `(auth)` = telas sem login, `(tabs)` = abas principais                                                       |
| `src/components`   | Componentes visuais. `ui/` é o design system (Button, Card, TextField…)                                                            |
| `src/hooks`        | Hooks de dados (`queries.ts`), treino ativo, rede, estatísticas corporais                                                          |
| `src/services`     | `api.ts` (CRUD), `auth.ts`, `account.ts` (foto, exportação, exclusão), `activeWorkout.ts`, `offline/outbox.ts`, `notifications.ts` |
| `src/lib`          | Cliente Supabase, armazenamento seguro da sessão, QueryClient, env                                                                 |
| `src/schemas`      | Validação com Zod (formulários)                                                                                                    |
| `src/utils`        | Funções puras: IMC, formatação, datas, totais de treino, objetivos                                                                 |
| `src/theme`        | Tokens de cor/tipografia e `ThemeProvider` (escuro por padrão)                                                                     |
| `src/constants`    | Rótulos, textos legais, mapa de mídia dos exercícios (gerado)                                                                      |
| `assets/exercises` | GIFs e pôsteres originais gerados por `scripts/gifs`                                                                               |
| `supabase`         | Migrations, seed e testes de banco                                                                                                 |

## Navegação e proteção de rotas

`src/app/_layout.tsx` usa `Stack.Protected`:

- sem sessão → só `(auth)`, `reset-password`, `auth/callback` e `legal`;
- com sessão → `(tabs)` e as telas internas;
- durante a recuperação de senha (`recovering`) o usuário fica preso em `reset-password`
  até definir a nova senha.

Abas: **Início**, **Treinos**, **Registrar**, **Métricas**, **Perfil** (barra customizada em
`components/TabBar.tsx`).

## Autenticação

- Fluxo **PKCE** do Supabase; links de e-mail voltam para `fittrack://auth/callback` e
  `fittrack://reset-password` (`services/auth.ts → handleAuthUrl`).
- A sessão fica no **SecureStore** (dividida em pedaços por causa do limite de 2 KB).
  Com “Permanecer conectado” desligado, a sessão fica só na memória e some ao fechar o app.
- O token é renovado só com o app em primeiro plano (`AppState`).

## Treino ao vivo e modo offline

1. `services/activeWorkout.ts` guarda o treino em andamento no AsyncStorage a cada mudança.
   Se o app fechar, `hydrate()` restaura do aparelho (ou do servidor, se for outro aparelho).
2. Cada mudança vira uma operação na **outbox** (`services/offline/outbox.ts`):
   - IDs são UUIDs gerados no app e o envio é `upsert` → reenviar nunca duplica;
   - várias edições da mesma série viram uma só operação;
   - sem internet a fila fica salva e é enviada quando a conexão volta (NetInfo).
3. O banco garante **um treino ativo por usuário** (índice único parcial) e calcula a
   duração ao finalizar (trigger).

## Dados derivados

- Totais de sessão: view `workout_session_stats` (`security_invoker`, respeita RLS).
- Evolução por exercício: view `exercise_session_progress` (carga máxima, volume, 1RM Epley).
- IMC: calculado no app a partir da medição mais recente de peso e altura.
- Objetivos: progresso calculado com medições, sessões da semana e cargas registradas.

## Mídia dos exercícios

GIFs **originais** gerados por código (`scripts/gifs`, Python + Pillow): um boneco 2D
com cinemática direta/inversa, destacando o músculo principal. Ficam embutidos no app
(`assets/exercises`) e são exibidos com `expo-image` (cache em memória e disco) com pôster
e fallback. Nenhuma mídia de terceiros é usada.
