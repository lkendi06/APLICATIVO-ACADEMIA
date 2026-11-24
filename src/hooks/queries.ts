import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/contexts/AuthContext';
import { qk } from '@/lib/queryClient';
import { avatarService } from '@/services/account';
import {
  exerciseApi,
  goalsApi,
  metricsApi,
  planApi,
  profileApi,
  sessionApi,
  type MetricInput,
  type PlanInput,
} from '@/services/api';
import type { Profile, UserGoal, UserPreferences } from '@/types/database';

// ---- Perfil -----------------------------------------------------------------
export function useProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: qk.profile(uid),
    queryFn: () => profileApi.get(uid),
    enabled: !!uid,
  });
}

export function useUpdateProfile() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) => profileApi.update(uid, patch),
    onSuccess: (p) => qc.setQueryData(qk.profile(uid), p),
  });
}

export function usePreferences() {
  const uid = useUserId();
  return useQuery({
    queryKey: qk.preferences(uid),
    queryFn: () => profileApi.getPreferences(uid),
    enabled: !!uid,
  });
}

export function useUpdatePreferences() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => profileApi.updatePreferences(uid, patch),
    onMutate: async (patch) => {
      const prev = qc.getQueryData<UserPreferences>(qk.preferences(uid));
      if (prev) qc.setQueryData(qk.preferences(uid), { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => ctx?.prev && qc.setQueryData(qk.preferences(uid), ctx.prev),
    onSuccess: (p) => qc.setQueryData(qk.preferences(uid), p),
  });
}

export function useUnits() {
  const { data } = usePreferences();
  return { weight: data?.weight_unit ?? 'kg', length: data?.length_unit ?? 'cm' } as const;
}

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: qk.avatarUrl(path ?? null),
    queryFn: () => avatarService.signedUrl(path!),
    enabled: !!path,
    staleTime: 50 * 60_000,
  });
}

// ---- Exercícios -------------------------------------------------------------
export function useExercises() {
  return useQuery({ queryKey: qk.exercises, queryFn: exerciseApi.list, staleTime: 60 * 60_000 });
}

export function useExercise(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.exercise(id ?? ''),
    queryFn: () => exerciseApi.get(id!),
    enabled: !!id,
    initialData: () =>
      qc
        .getQueryData<Awaited<ReturnType<typeof exerciseApi.list>>>(qk.exercises)
        ?.find((e) => e.id === id),
  });
}

export function useFavorites() {
  return useQuery({ queryKey: qk.favorites, queryFn: exerciseApi.favorites });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      exerciseApi.setFavorite(id, favorite),
    onMutate: async ({ id, favorite }) => {
      const prev = qc.getQueryData<string[]>(qk.favorites) ?? [];
      qc.setQueryData(qk.favorites, favorite ? [...prev, id] : prev.filter((x) => x !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.favorites, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.favorites }),
  });
}

export function usePreviousSets(exerciseId: string, excludeSession?: string | null) {
  return useQuery({
    queryKey: qk.previousSets(exerciseId, excludeSession),
    queryFn: () => exerciseApi.previousSets(exerciseId, excludeSession),
    staleTime: 5 * 60_000,
  });
}

// ---- Planos -----------------------------------------------------------------
export function usePlans() {
  return useQuery({ queryKey: qk.plans, queryFn: planApi.list });
}

export function usePlan(id: string | undefined) {
  return useQuery({ queryKey: qk.plan(id ?? ''), queryFn: () => planApi.get(id!), enabled: !!id });
}

export function useSavePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: PlanInput }) => {
      if (id) {
        await planApi.update(id, input);
        return id;
      }
      return planApi.create(input);
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: qk.plans });
      qc.invalidateQueries({ queryKey: qk.plan(id) });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plans }),
  });
}

export function useDuplicatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plans }),
  });
}

// ---- Sessões ----------------------------------------------------------------
export function useSessionStats(params?: { from?: Date; to?: Date; limit?: number }) {
  const key = `${params?.from?.toISOString() ?? ''}|${params?.to?.toISOString() ?? ''}|${params?.limit ?? ''}`;
  return useQuery({ queryKey: qk.sessions(key), queryFn: () => sessionApi.stats(params) });
}

export function useSessionDetail(id: string | undefined) {
  return useQuery({
    queryKey: qk.session(id ?? ''),
    queryFn: () => sessionApi.detail(id!),
    enabled: !!id,
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.sessionsAll });
      qc.invalidateQueries({ queryKey: ['exercise-progress'] });
    },
  });
}

export function useExerciseProgress(exerciseId: string | undefined, from?: Date) {
  return useQuery({
    queryKey: qk.exerciseProgress(exerciseId ?? '', from?.toISOString() ?? 'all'),
    queryFn: () => sessionApi.exerciseProgress(exerciseId!, from),
    enabled: !!exerciseId,
  });
}

export function useTrainedExercises() {
  return useQuery({ queryKey: qk.trainedExercises, queryFn: sessionApi.trainedExercises });
}

// ---- Métricas ---------------------------------------------------------------
export function useMetrics(params?: { from?: Date; to?: Date }) {
  const key = `${params?.from?.toISOString() ?? ''}|${params?.to?.toISOString() ?? ''}`;
  return useQuery({ queryKey: qk.metrics(key), queryFn: () => metricsApi.list(params) });
}

export function useSaveMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MetricInput }) =>
      id ? metricsApi.update(id, input) : metricsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metricsAll }),
  });
}

export function useDeleteMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => metricsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metricsAll }),
  });
}

// ---- Objetivos --------------------------------------------------------------
export function useGoals() {
  return useQuery({ queryKey: qk.goals, queryFn: goalsApi.list });
}

export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string;
      input: Pick<UserGoal, 'type' | 'title'> & Partial<UserGoal>;
    }) => (id ? goalsApi.update(id, input) : goalsApi.create(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });
}
