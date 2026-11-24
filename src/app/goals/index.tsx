import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  IconButton,
  ListSkeleton,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { GOAL_TYPE_LABEL } from '@/constants/profile';
import { useFeedback } from '@/contexts/FeedbackContext';
import {
  useDeleteGoal,
  useExerciseProgress,
  useExercises,
  useGoals,
  useMetrics,
  useSaveGoal,
  useSessionStats,
  useUnits,
} from '@/hooks/queries';
import { latestValues } from '@/hooks/useBodyStats';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import type { UserGoal } from '@/types/database';
import { startOfWeek } from '@/utils/dates';
import { friendlyError } from '@/utils/errors';
import { formatDate, formatNumber, formatWeight } from '@/utils/format';
import { goalProgress } from '@/utils/goals';

export default function GoalsScreen() {
  const goals = useGoals();
  const active = (goals.data ?? []).filter((g) => g.status === 'active');
  const done = (goals.data ?? []).filter((g) => g.status !== 'active');

  return (
    <Screen
      title="Objetivos"
      back
      refreshing={goals.isRefetching}
      onRefresh={goals.refetch}
      right={
        <IconButton
          icon="add"
          tone="primary"
          label="Novo objetivo"
          onPress={() => router.push('/goals/new')}
          testID="goals-new"
        />
      }>
      {goals.isLoading ? (
        <ListSkeleton rows={3} height={120} />
      ) : goals.error ? (
        <ErrorView error={goals.error} onRetry={goals.refetch} />
      ) : (goals.data ?? []).length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="Defina seu primeiro objetivo"
          message="Peso-alvo, treinos por semana, gordura corporal ou carga em um exercício. O progresso é calculado com os dados que você registra."
          actionLabel="Criar objetivo"
          onAction={() => router.push('/goals/new')}
        />
      ) : (
        <>
          {active.length ? <SectionHeader title={`Em andamento (${active.length})`} /> : null}
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
          {done.length ? <SectionHeader title="Concluídos e arquivados" /> : null}
          {done.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </>
      )}
    </Screen>
  );
}

/** Valor atual de um objetivo, calculado a partir de medições, sessões e cargas reais. */
function useGoalCurrent(goal: UserGoal): number | null {
  const metrics = useMetrics();
  const weekSessions = useSessionStats({ from: useMemo(() => startOfWeek(), []) });
  const progress = useExerciseProgress(
    goal.type === 'exercise_load' ? (goal.exercise_id ?? undefined) : undefined,
  );
  return useMemo(() => {
    switch (goal.type) {
      case 'target_weight':
        return latestValues(metrics.data ?? []).weight?.weight_kg ?? null;
      case 'body_fat':
        return latestValues(metrics.data ?? []).bodyFat?.body_fat_pct ?? null;
      case 'weekly_workouts':
        return weekSessions.data?.length ?? null;
      case 'exercise_load': {
        const rows = progress.data ?? [];
        return rows.length ? Math.max(...rows.map((r) => r.max_weight_kg)) : null;
      }
      default:
        return null;
    }
  }, [goal.type, metrics.data, weekSessions.data, progress.data]);
}

function GoalCard({ goal }: { goal: UserGoal }) {
  const { colors } = useTheme();
  const units = useUnits();
  const exercises = useExercises();
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const { toast, confirm } = useFeedback();
  const current = useGoalCurrent(goal);
  const p = goalProgress(goal, current);
  const exerciseName = goal.exercise_id
    ? exercises.data?.find((e) => e.id === goal.exercise_id)?.name
    : null;

  const fmt = (v: number | null) => {
    if (v == null) return '—';
    if (goal.type === 'target_weight' || goal.type === 'exercise_load')
      return formatWeight(v, units.weight);
    if (goal.type === 'body_fat') return `${formatNumber(v, 1)}%`;
    if (goal.type === 'weekly_workouts') return `${v} ${v === 1 ? 'treino' : 'treinos'}`;
    return `${formatNumber(v, 1)}${goal.unit ? ` ${goal.unit}` : ''}`;
  };

  const overdue =
    goal.status === 'active' && goal.deadline && new Date(`${goal.deadline}T23:59:59`) < new Date();

  async function setStatus(status: UserGoal['status']) {
    try {
      await save.mutateAsync({
        id: goal.id,
        input: {
          type: goal.type,
          title: goal.title,
          status,
          achieved_at: status === 'achieved' ? new Date().toISOString() : null,
        },
      });
      toast(
        status === 'achieved'
          ? 'Parabéns! Objetivo concluído 🎉'
          : status === 'archived'
            ? 'Objetivo arquivado.'
            : 'Objetivo reativado.',
      );
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Excluir objetivo?',
      message: `"${goal.title}" será removido.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(goal.id);
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  }

  return (
    <Card style={{ gap: spacing.md, opacity: goal.status === 'archived' ? 0.7 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="h3">{goal.title}</Text>
          <Text variant="caption" color="textMuted">
            {GOAL_TYPE_LABEL[goal.type]}
            {exerciseName ? ` · ${exerciseName}` : ''}
            {goal.deadline ? ` · até ${formatDate(goal.deadline + 'T12:00:00')}` : ''}
          </Text>
        </View>
        {goal.status === 'achieved' ? (
          <Badge label="Concluído" tone="success" />
        ) : goal.status === 'archived' ? (
          <Badge label="Arquivado" />
        ) : p.reached ? (
          <Badge label="Meta atingida" tone="success" />
        ) : overdue ? (
          <Badge label="Prazo vencido" tone="warning" />
        ) : null}
      </View>

      {goal.type !== 'custom' ? (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodySm" color="textMuted">
              Atual: <Text variant="bodySm">{fmt(current)}</Text>
            </Text>
            <Text variant="bodySm" color="textMuted">
              Meta: <Text variant="bodySm">{fmt(goal.target_value)}</Text>
            </Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: radii.pill,
              backgroundColor: colors.surfaceAlt,
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: `${Math.round((p.ratio ?? 0) * 100)}%`,
                height: '100%',
                backgroundColor: p.reached ? colors.success : colors.primary,
                borderRadius: radii.pill,
              }}
            />
          </View>
          <Text variant="caption" color="textSubtle">
            {current == null
              ? 'Ainda sem dados. Registre medições ou treinos para ver o progresso.'
              : p.ratio != null
                ? `${Math.round(p.ratio * 100)}% do caminho${goal.start_value != null && goal.type !== 'weekly_workouts' ? ` (início: ${fmt(goal.start_value)})` : ''}`
                : goal.type === 'weekly_workouts'
                  ? 'Nesta semana'
                  : ''}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {goal.status === 'active' ? (
          <>
            <Button
              title="Concluir"
              size="sm"
              variant={p.reached ? 'primary' : 'secondary'}
              icon="checkmark"
              onPress={() => setStatus('achieved')}
            />
            <Button
              title="Editar"
              size="sm"
              variant="ghost"
              onPress={() => router.push({ pathname: '/goals/new', params: { id: goal.id } })}
            />
            <Button
              title="Arquivar"
              size="sm"
              variant="ghost"
              onPress={() => setStatus('archived')}
            />
          </>
        ) : (
          <Button
            title="Reativar"
            size="sm"
            variant="secondary"
            onPress={() => setStatus('active')}
          />
        )}
        <Button title="Excluir" size="sm" variant="ghost" onPress={onDelete} />
      </View>
    </Card>
  );
}
