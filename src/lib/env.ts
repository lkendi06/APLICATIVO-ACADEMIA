/**
 * Variáveis de ambiente públicas (embutidas no app pelo Expo).
 * Apenas a URL e a chave anon/publishable do Supabase. Nunca a service_role.
 */

/**
 * Aceita a URL como o painel do Supabase mostra em lugares diferentes
 * (com barra no fim, ou com /rest/v1, /auth/v1...) e deixa só a base do projeto.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim().replace(/^["']|["']$/g, '');
  const match = /^(https?:\/\/[^/?#]+)/i.exec(value);
  return match ? match[1] : value;
}

export const env = {
  supabaseUrl: normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '')
    .trim()
    .replace(/^["']|["']$/g, ''),
};

export function isSupabaseConfigured(): boolean {
  return (
    /^https:\/\/.+/.test(env.supabaseUrl) &&
    env.supabaseAnonKey.length > 20 &&
    !env.supabaseUrl.includes('SEU-PROJETO')
  );
}
