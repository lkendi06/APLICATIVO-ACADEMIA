/**
 * Variáveis de ambiente públicas (embutidas no app pelo Expo).
 * Apenas a URL e a chave anon/publishable do Supabase. Nunca a service_role.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export function isSupabaseConfigured(): boolean {
  return (
    /^https:\/\/.+/.test(env.supabaseUrl) &&
    env.supabaseAnonKey.length > 20 &&
    !env.supabaseUrl.includes('SEU-PROJETO')
  );
}
