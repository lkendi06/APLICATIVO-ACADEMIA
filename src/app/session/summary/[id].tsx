import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { ExerciseMedia } from '@/components/exercise/ExerciseMedia';
import { Badge, Button, Card, ErrorView, Icon, IconButton, LoadingView, Screen, SectionHeader, StatTile, Text } from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { useDeleteSession, useSessionDetail, useSessionStats } from '@/hooks/queries';
import { usePendingSync } from '@/hooks/useActiveWorkout';
import { activeWorkout } from '@/services/activeWorkout';
import type { SessionDetail } from '@/services/api';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';
import { formatDateTime, formatDuration, formatNumber } from '@/utils/format';
import { computeTotals, percentChange } from '@/utils/workout';

export default function SessionSummary() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { colors } = useTheme();
  const detail = useSessionDetail(id);
  const pending = usePendingSync();
  const stats = useSessionStats({ limit: 60 });
  const del = useDeleteSession();
  const { confirm, toast } = useFeedback();

  // Sem internet logo após finalizar: usa a cópia local até sincronizar.
  const local = activeWorkout.getLastFinished();
  const data: SessionDetail | null = useMemo(() => {
    if (detail.data) return detail.data;
    if (local && local.session.id === id) {
      return {
        ...local.session,
        exercises: local.exercises.map((e) => ({ ...e, sets: local.sets.filter((s) => s.session_exercise_id === e.id) })),
      };
    }
    return null;
  }, [detail.data, local, id]);

  if (detail.isLoading && !data) return <LoadingView label="Carregando resumo…" />;
  if (!data) return <ErrorView error={detail.error} onRetry={detail.refetch} />;

  const allSets = data.exercises.flatMap((e) => e.sets);
  const totals = computeTotals(allSets);
  const exercisesDone = data.exercises.filter((e) => e.sets.some((s) => s.completed));

  // Comparação: sessão anterior do mesmo plano (ou a anterior qualquer).
  const previous = (stats.data ?? []).find(
    (s) => s.session_id !== id && new Date(s.started_at) < new Date(data.started_at) && (data.plan_id ? s.plan_id === data.plan_id : true),
  );
  const volDiff = previous ? percentChange(totals.volumeKg, previous.total_volume_kg) : null;
  const repsDiff = previous ? totals.totalReps - previous.total_reps : null;

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Excluir este treino do histórico?',
      message: 'Todas as séries desta sessão serão apagadas. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    del.mutate(id, {
      onSuccess: () => {
        toast('Treino excluído do histórico.');
        router.back();
      },
      onError: (e) => toast(friendlyError(e), 'error'),
    });
  };

  return (
    <Screen
      back={!fresh}
      title={fresh ? undefined : 'Resumo do treino'}
      right={!fresh ? <IconButton icon="trash-outline" tone="danger" label="Excluir treino" onPress={onDelete} /> : undefined}
      footer={fresh ? <Button title="Concluir" size="lg" onPress={() => router.replace('/')} testID="summary-done" /> : undefined}>
      {fresh ? (
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.hero}>
          <View style={[styles.trophy, { backgroundColor: colors.primary }]}>
            <Icon name="trophy" size={40} color={colors.onPrimary} />
          </View>
          <Text variant="h1" align="center">
            Treino concluído!
          </Text>
          <Text color="textMuted" align="center">
            Ótimo trabalho. Tudo foi salvo no seu histórico.
          </Text>
        </Animated.View>
      ) : null}
      {pending > 0 && local?.session.id === id ? (
        <Badge label="Salvo no aparelho · sincronizando" tone="warning" />
      ) : null}

      <Animated.View entering={FadeInDown.delay(100)} style={{ gap: spacing.xs }}>
        <Text variant="h2">{data.name}</Text>
        <Text variant="caption" color="textMuted">
          {formatDateTime(data.started_at)}
        </Text>
      </Animated.View>

      <View style={styles.grid}>
        <StatTile label="Duração" icon="time-outline" value={formatDuration(data.duration_seconds)} />
        <StatTile label="Exercícios" icon="list-outline" value={String(exercisesDone.length)} />
        <StatTile label="Séries concluídas" icon="layers-outline" value={String(totals.completedSets)} />
        <StatTile
          label="Repetições"
          icon="repeat-outline"
          value={String(totals.totalReps)}
          trend={repsDiff != null ? { value: `${repsDiff >= 0 ? '+' : ''}${repsDiff} vs anterior`, positive: repsDiff >= 0 } : null}
        />
      </View>
      <StatTile
        label="Volume total (carga × repetições)"
        icon="barbell-outline"
        value={`${formatNumber(totals.volumeKg, 1)} kg`}
        trend={volDiff != null ? { value: `${volDiff >= 0 ? '+' : ''}${formatNumber(volDiff, 1)}% vs ${previous?.name}`, positive: volDiff >= 0 } : null}
        hint={previous ? undefined : 'Primeira sessão para comparar'}
      />

      <SectionHeader title="Exercícios realizados" />
      {exercisesDone.map((e) => {
        const t = computeTotals(e.sets);
        return (
          <Card key={e.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <ExerciseMedia mediaKey={e.exercise.media_key} mediaUrl={e.exercise.media_url} name={e.exercise.name} animated={false} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{e.exercise.name}</Text>
                <Text variant="caption" color="textMuted">
                  {t.completedSets} séries · {t.totalReps} reps · {formatNumber(t.volumeKg, 0)} kg
                </Text>
              </View>
            </View>
            {e.sets
              .filter((s) => s.completed)
              .map((s) => (
                <View key={s.id} style={[styles.setLine, { borderTopColor: colors.border }]}>
                  <Text variant="bodySm" color="textMuted">
                    Série {s.set_number}
                  </Text>
                  <Text variant="bodySm" tabular>
                    {e.exercise.is_timed
                      ? `${s.duration_seconds ?? 0}s`
                      : `${s.reps} reps × ${formatNumber(s.weight_kg, 1)} kg`}
                  </Text>
                  <Icon name="checkmark-circle" size={16} color="success" />
                </View>
              ))}
          </Card>
        );
      })}
      {data.notes ? (
        <Card tone="alt">
          <Text variant="bodySm">{data.notes}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  trophy: { width: 84, height: 84, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  setLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
});
