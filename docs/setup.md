# Configuração

## Requisitos

- Node.js 22+
- App **Expo Go** no celular (Android/iOS) ou um emulador
- Um projeto no [Supabase](https://supabase.com)

## 1. Instalar

```bash
git clone https://github.com/lkendi06/APLICATIVO-ACADEMIA.git
cd APLICATIVO-ACADEMIA
npm install
```

## 2. Supabase

1. **SQL Editor** → rode, em ordem, os arquivos de `supabase/migrations/` e depois `supabase/seed.sql`.
2. **Authentication → URL Configuration**
   - _Site URL_: `fittrack://`
   - _Redirect URLs_ (uma por linha): `fittrack://auth/callback` e `fittrack://reset-password`
   - Para testar no Expo Go, adicione também `exp://**`.
3. **Authentication → Providers → Email**: deixe “Confirm email” ligado.
4. **Project Settings → API**: copie a _Project URL_ e a chave **anon / publishable**.

> A chave `service_role` **nunca** vai no app. Ela ignora todas as regras de segurança.

## 3. Variáveis de ambiente

```bash
cp .env.example .env
# edite .env com a URL e a chave pública
```

O `.env` está no `.gitignore`. Se as variáveis faltarem, o app mostra uma tela explicando
o que configurar.

## 4. Rodar

```bash
npx expo start          # escaneie o QR code com o Expo Go
npx expo start --web    # versão web (para testes rápidos)
```

Notificações e alguns recursos nativos funcionam melhor em um _development build_:

```bash
npx expo run:android    # ou run:ios (macOS)
```

## Comandos úteis

| Comando             | O que faz                                       |
| ------------------- | ----------------------------------------------- |
| `npm run lint`      | ESLint + Prettier                               |
| `npm run typecheck` | TypeScript                                      |
| `npm test`          | Testes do app (Jest + Testing Library)          |
| `npm run test:db`   | Migrations + testes de RLS em um Postgres local |
| `npm run gifs`      | Regenera os GIFs dos exercícios                 |
