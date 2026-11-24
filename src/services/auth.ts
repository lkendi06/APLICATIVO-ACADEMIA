import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';
import { clearPersistedSession, setRememberMe } from '@/lib/sessionStorage';

/** URLs de retorno usadas nos e-mails do Supabase (cadastre-as no painel). */
export const authRedirects = {
  callback: () => Linking.createURL('auth/callback'),
  resetPassword: () => Linking.createURL('reset-password'),
};

export const authService = {
  async signUp(params: { fullName: string; email: string; password: string }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email.trim().toLowerCase(),
      password: params.password,
      options: {
        emailRedirectTo: authRedirects.callback(),
        data: { full_name: params.fullName.trim(), terms_accepted_at: new Date().toISOString() },
      },
    });
    if (error) throw error;
    // Com confirmação de e-mail ativa, o Supabase não revela se o e-mail já existe:
    // retorna um usuário sem identidades. Tratamos isso como "já cadastrado".
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const err = new Error('User already registered') as Error & { code: string };
      err.code = 'user_already_exists';
      throw err;
    }
    return { needsConfirmation: !data.session, user: data.user };
  },

  async signIn(params: { email: string; password: string; remember: boolean }) {
    await setRememberMe(params.remember);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email.trim().toLowerCase(),
      password: params.password,
    });
    if (error) throw error;
    if (!params.remember) await clearPersistedSession('fittrack-auth');
    return data.session;
  },

  async resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: authRedirects.callback() },
    });
    if (error) throw error;
  },

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: authRedirects.resetPassword(),
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async updateEmail(email: string) {
    const { error } = await supabase.auth.updateUser(
      { email: email.trim().toLowerCase() },
      { emailRedirectTo: authRedirects.callback() },
    );
    if (error) throw error;
  },

  /**
   * Processa links de retorno (confirmação de e-mail / recuperação de senha).
   * Suporta o fluxo PKCE (?code=) e o fluxo implícito (#access_token=).
   */
  async handleAuthUrl(url: string): Promise<'ok' | 'none'> {
    const parsed = new URL(url.replace('#', url.includes('?') ? '&' : '?'));
    const params = parsed.searchParams;
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      const err = new Error(errorDescription) as Error & { code?: string };
      err.code = params.get('error_code') ?? undefined;
      throw err;
    }
    const code = params.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return 'ok';
    }
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      return 'ok';
    }
    const token_hash = params.get('token_hash');
    const type = params.get('type');
    if (token_hash && (type === 'signup' || type === 'recovery' || type === 'email')) {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) throw error;
      return 'ok';
    }
    return 'none';
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
