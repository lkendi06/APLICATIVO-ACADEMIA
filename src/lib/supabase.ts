import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { env, isSupabaseConfigured } from './env';
import { sessionStorage } from './sessionStorage';

export const supabase = createClient<Database>(
  isSupabaseConfigured() ? env.supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? env.supabaseAnonKey : 'placeholder-anon-key-not-configured',
  {
    auth: {
      storage: sessionStorage,
      storageKey: 'fittrack-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

// Atualiza o token apenas com o app em primeiro plano (recomendação do Supabase para RN).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
