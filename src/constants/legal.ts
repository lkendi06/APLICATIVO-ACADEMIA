type Doc = { title: string; updatedAt: string; sections: { heading: string; body: string }[] };

/**
 * Textos-base de Termos e Privacidade. Antes de publicar o app nas lojas,
 * revise-os com um profissional jurídico (LGPD).
 */
export const LEGAL_DOCS: Record<'terms' | 'privacy', Doc> = {
  terms: {
    title: 'Termos de Uso',
    updatedAt: '24/11/2026',
    sections: [
      {
        heading: '1. Sobre o FitTrack',
        body: 'O FitTrack é um aplicativo para organizar treinos, registrar séries e acompanhar métricas corporais. Ele não substitui a orientação de profissionais de educação física, nutrição ou saúde.',
      },
      {
        heading: '2. Sua conta',
        body: 'Você é responsável por manter sua senha em segredo e pelas informações cadastradas. É necessário ter pelo menos 13 anos; menores de 18 anos devem usar o app com acompanhamento de um responsável.',
      },
      {
        heading: '3. Saúde e segurança',
        body: 'Procure avaliação médica antes de iniciar atividades físicas. Indicadores como o IMC e o simulador corporal são apenas referências gerais e ilustrativas, sem valor de diagnóstico.',
      },
      {
        heading: '4. Conteúdo',
        body: 'As animações e textos dos exercícios são originais do FitTrack e servem como orientação geral. Execute os movimentos dentro dos seus limites.',
      },
      {
        heading: '5. Encerramento',
        body: 'Você pode excluir sua conta a qualquer momento em Perfil → Conta e dados. A exclusão remove permanentemente seus dados.',
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    updatedAt: '24/11/2026',
    sections: [
      {
        heading: 'Dados que coletamos',
        body: 'Nome, e-mail, foto de perfil (opcional), dados de treino (exercícios, séries, cargas e repetições), métricas corporais e objetivos que você mesmo cadastra.',
      },
      {
        heading: 'Como usamos',
        body: 'Exclusivamente para oferecer as funcionalidades do app: histórico, gráficos, comparações e lembretes. Não vendemos nem compartilhamos seus dados para publicidade.',
      },
      {
        heading: 'Armazenamento e segurança',
        body: 'Os dados ficam no Supabase (PostgreSQL) com regras de acesso por usuário (Row Level Security): cada pessoa só acessa os próprios registros. A sessão de login é guardada de forma criptografada no aparelho.',
      },
      {
        heading: 'Seus direitos (LGPD)',
        body: 'Você pode consultar, corrigir, exportar (Perfil → Conta e dados → Exportar) e excluir seus dados a qualquer momento.',
      },
      {
        heading: 'Contato',
        body: 'Em caso de dúvidas sobre privacidade, entre em contato pelo canal de suporte informado na página do app.',
      },
    ],
  },
};
