import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { flushOutbox } from '@/services/offline/outbox';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: (count, error) => {
        const code = (error as { code?: string })?.code;
        if (code === 'PGRST116' || code === '42501') return false;
        return count < 2;
      },
    },
    mutations: { retry: 0 },
  },
});

// Estado de conexão: pausa/retoma requisições e envia a fila offline ao reconectar.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    setOnline(online);
    if (online) flushOutbox().catch(() => undefined);
  }),
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
    if (status === 'active') flushOutbox().catch(() => undefined);
  });
}

export const qk = {
  profile: (uid: string) => ['profile', uid] as const,
  preferences: (uid: string) => ['preferences', uid] as const,
  exercises: ['exercises'] as const,
  exercise: (id: string) => ['exercise', id] as const,
  favorites: ['favorites'] as const,
  plans: ['plans'] as const,
  plan: (id: string) => ['plan', id] as const,
  sessions: (key: string) => ['sessions', key] as const,
  sessionsAll: ['sessions'] as const,
  session: (id: string) => ['session', id] as const,
  previousSets: (exerciseId: string, exclude?: string | null) =>
    ['previous-sets', exerciseId, exclude ?? null] as const,
  exerciseProgress: (exerciseId: string, key: string) =>
    ['exercise-progress', exerciseId, key] as const,
  trainedExercises: ['trained-exercises'] as const,
  metrics: (key: string) => ['metrics', key] as const,
  metricsAll: ['metrics'] as const,
  goals: ['goals'] as const,
  avatarUrl: (path: string | null) => ['avatar-url', path] as const,
};
