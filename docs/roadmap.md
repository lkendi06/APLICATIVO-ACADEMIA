# Roadmap

| Marco               | Escopo                                                                                                                                                        | Status |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **M1** Fundação     | Expo + TypeScript, design system, schema, RLS, seed, GIFs                                                                                                     | ✅     |
| **M2** Autenticação | Cadastro, login, “permanecer conectado”, verificação de e-mail, recuperação de senha, proteção de rotas                                                       | ✅     |
| **M3** Treinos      | Criar/editar/duplicar/reordenar/excluir treinos, biblioteca com 11 grupos musculares, registro ao vivo com timer, pausa e modo offline, resumo com comparação | ✅     |
| **M4** Métricas     | Medições com histórico, IMC (OMS) com avisos, simulador corporal ilustrativo, histórico e gráficos com filtros                                                | ✅     |
| **M5** Perfil       | Foto, dados pessoais, objetivos, tema, unidades, lembretes, exportação de dados, exclusão de conta                                                            | ✅     |
| **M6** Qualidade    | Testes, CI, templates, documentação                                                                                                                           | ✅     |

## Próximos passos sugeridos

- Testes de ponta a ponta em aparelho real (Maestro ou Detox).
- Builds de loja com EAS (`eas build`) e ícone/splash definitivos.
- Gerar `src/types/supabase.ts` automaticamente no CI.
- Login social (Google/Apple).
- Mais exercícios e GIFs.
- Sincronização em segundo plano de medições offline (hoje só o treino ao vivo é offline).
