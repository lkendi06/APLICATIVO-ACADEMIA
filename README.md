# FitTrack

Aplicativo de academia para **Android e iOS** feito com Expo e Supabase: monte seus treinos,
registre cada série em tempo real (inclusive sem internet), acompanhe medidas, IMC e evolução.

> Você pode renomear este repositório para `fittrack-mobile` em _Settings → General_ no GitHub.

## Funcionalidades

- **Conta**: cadastro com aceite dos termos, confirmação de e-mail, login com “permanecer
  conectado”, recuperação de senha por link, troca de e-mail/senha, exclusão de conta.
- **Treinos**: criar, editar, duplicar, reordenar e excluir; séries, repetições, carga, descanso.
- **Biblioteca**: 28 exercícios em 11 grupos musculares, cada um com **GIF animado original**.
- **Registrar**: treino ao vivo com timer de descanso, pausa, cada série salva no banco,
  funcionamento offline e recuperação da sessão se o app fechar. Resumo com comparação.
- **Métricas**: peso, altura e medidas opcionais com histórico (nada é sobrescrito), IMC com
  classificação da OMS para adultos e avisos, **simulador corporal ilustrativo**.
- **Histórico**: gráficos por treino, exercício e corpo com filtros de 7 dias a 12 meses ou
  período personalizado.
- **Perfil**: foto, objetivo, metas, tema (escuro padrão), unidades kg/lb e cm/in, lembretes,
  exportação dos dados em JSON.

## Tecnologia

Expo SDK 58 · React Native · TypeScript (strict) · Expo Router · Reanimated · expo-image ·
React Hook Form + Zod · TanStack Query · Supabase (Auth, Postgres com RLS, Storage) ·
Jest + Testing Library · ESLint + Prettier · GitHub Actions.

## Começando

```bash
npm install
cp .env.example .env   # preencha com a URL e a chave pública do Supabase
npx expo start
```

Passo a passo completo (incluindo o Supabase): [docs/setup.md](docs/setup.md).

## Documentação

- [Arquitetura](docs/architecture.md)
- [Banco de dados](docs/database.md)
- [Configuração](docs/setup.md)
- [Roadmap](docs/roadmap.md)
- [Como contribuir](CONTRIBUTING.md)

## Testes

```bash
npm test          # 78 testes do app
npm run test:db   # 44 verificações de segurança do banco (precisa de Postgres)
```

## Aviso

O IMC e o simulador corporal são **indicativos** e não substituem avaliação de um
profissional de saúde. O simulador é uma ilustração e não prevê o corpo real.
