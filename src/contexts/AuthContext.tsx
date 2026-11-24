import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { activeWorkout } from '@/services/activeWorkout';
import { flushOutbox, loadOutbox } from '@/services/offline/outbox';

type AuthValue = {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  /** true quando o usuário entrou por um link de recuperação de senha. */
  recovering: boolean;
  setRecovering: (v: boolean) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadOutbox().catch(() => undefined);
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session) await activeWorkout.hydrate(data.session.user.id);
      })
      .finally(() => mounted && setInitializing(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_IN' && next) {
        activeWorkout.hydrate(next.user.id).catch(() => undefined);
        flushOutbox().catch(() => undefined);
      }
      if (event === 'SIGNED_OUT') {
        setRecovering(false);
        queryClient.clear();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, initializing, recovering, setRecovering }),
    [session, initializing, recovering],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}

/** Atalho para telas protegidas (o layout garante que há sessão). */
export function useUserId(): string {
  const { user } = useAuth();
  return user?.id ?? '';
}
