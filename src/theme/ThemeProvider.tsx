import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ColorTokens } from './tokens';

export type ThemePreference = 'dark' | 'light' | 'system';

type ThemeContextValue = {
  colors: ColorTokens;
  scheme: 'dark' | 'light';
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

const STORAGE_KEY = 'fittrack.theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  // Modo escuro é o padrão inicial.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'dark' || v === 'light' || v === 'system') setPreferenceState(v);
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => undefined);
  }, []);

  const scheme: 'dark' | 'light' =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      preference,
      setPreference,
    }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback seguro (ex.: testes de componentes isolados)
    return { colors: darkColors, scheme: 'dark', preference: 'dark', setPreference: () => {} };
  }
  return ctx;
}
