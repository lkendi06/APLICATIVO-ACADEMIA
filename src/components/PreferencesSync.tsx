import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/hooks/queries';
import { useTheme } from '@/theme/ThemeProvider';

/** Aplica o tema salvo na conta do usuário quando ele entra em outro aparelho. */
export function PreferencesSync() {
  const { session } = useAuth();
  const { data } = usePreferences();
  const { setPreference, preference } = useTheme();
  useEffect(() => {
    if (session && data?.theme && data.theme !== preference) setPreference(data.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, data?.theme]);
  return null;
}
