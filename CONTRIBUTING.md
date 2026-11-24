# Como contribuir

1. Crie uma branch a partir de `main`: `git checkout -b feat/minha-mudanca`.
2. Siga o setup em [docs/setup.md](docs/setup.md).
3. Antes de abrir o PR, rode:
   ```bash
   npm run lint && npm run typecheck && npm test
   npm run test:db   # se mexeu no banco
   ```
4. Abra um Pull Request para `main` preenchendo o template. O CI precisa passar.

## Padrões

- **Idioma**: toda a interface em português do Brasil. Código e nomes de variáveis em inglês.
- **Banco**: toda mudança é uma nova migration em `supabase/migrations` (nunca edite uma já
  aplicada). Tabelas novas precisam de RLS e de testes em `supabase/tests/rls_test.sql`.
- **Segredos**: nada de chaves no código. Só `EXPO_PUBLIC_SUPABASE_URL` e a chave pública
  vão para o app; a `service_role` nunca.
- **Mídia**: apenas imagens/GIFs próprios ou com licença que permita uso. Registre a origem.
- **Commits**: mensagens curtas no imperativo (ex.: “Adiciona filtro por período”).
- **Formatação**: Prettier (`npm run format`).
