import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SyncBanner } from '@/components/SyncBanner';
import { Button, EmptyState, IconButton, LoadingView, Text } from '@/components/ui';
import { RestTimer } from '@/components/workout/RestTimer';
import { SessionExerciseCard } from '@/components/workout/SessionExerciseCard';
import { useFeedback } from '@/contexts/FeedbackContext';
import { usePreferences } from '@/hooks/queries';
import { useActiveWorkout, useNow } from '@/hooks/useActiveWorkout';
import { activeWorkout } from '@/services/activeWorkout';
import { exercisePicker } from '@/services/exercisePicker';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { formatClock, formatNumber } from '@/utils/format';
import { computeTotals, elapsedSeconds } from '@/utils/workout';

export default function LiveSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useActiveWorkout();
  const prefs = usePreferences();
  const qc = useQueryClient();
  const { confirm, toast } = useFeedback();
  const [finishing, setFinishing] = useState(false);
  const now = useNow(1000, !!state && !state.session.paused_at);

  // Sessão já finalizada ou de outro treino: abre o resumo.
  useEffect(() => {
    if (activeWorkout.isHydrated() && (!state || state.session.id !== id) && !finishing) {
      router.replace(`/session/summary/${id}`);
    }
  }, [state, id, finishing]);

  if (!state || state.session.id !== id) return <LoadingView />;

  const { session, exercises, sets } = state;
  const paused = !!session.paused_at;
  const totals = computeTotals(sets);
  const elapsed = elapsedSeconds(session, now);

  const addExercises = () => {
    exercisePicker.open((list) => {
      list.forEach((e) =>
        activeWorkout.addExercise(e, {
          restSeconds: prefs.data?.default_rest_seconds ?? 90,
          sets: e.recommended_sets ?? 3,
          reps: parseInt(e.recommended_reps ?? '10', 10) || 10,
        }),
      );
    });
    router.push({ pathname: '/exercises', params: { pick: '1' } });
  };

  const finish = async () => {
    const pending = sets.filter((s) => !s.completed).length;
    if (totals.completedSets === 0) {
      const discard = await confirm({
        title: 'Nenhuma série concluída',
        message: 'Marque as séries realizadas antes de finalizar. Deseja descartar este treino?',
        confirmLabel: 'Descartar treino',
        cancelLabel: 'Continuar treinando',
        destructive: true,
      });
      if (discard) {
        await activeWorkout.discard();
        router.replace('/');
      }
      return;
    }
    const ok = await confirm({
      title: 'Finalizar treino?',
      message: pending
        ? `${pending} série(s) não marcada(s) como concluída(s) serão descartadas.`
        : 'Todas as séries serão salvas no seu histórico.',
      confirmLabel: 'Finalizar',
    });
    if (!ok) return;
    setFinishing(true);
    const sessionId = await activeWorkout.finish();
    qc.invalidateQueries({ queryKey: ['sessions'] });
    qc.invalidateQueries({ queryKey: ['exercise-progress'] });
    qc.invalidateQueries({ queryKey: ['previous-sets'] });
    qc.invalidateQueries({ queryKey: ['trained-exercises'] });
    router.replace({ pathname: '/session/summary/[id]', params: { id: sessionId ?? id, fresh: '1' } });
  };

  const discard = async () => {
    const ok = await confirm({
      title: 'Descartar treino?',
      message: 'Todas as séries registradas nesta sessão serão apagadas. Esta ação não pode ser desfeita.',
      confirmLabel: 'Descartar',
      destructive: true,
    });
    if (!ok) return;
    await activeWorkout.discard();
    toast('Treino descartado.', 'info');
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton icon="chevron-down" label="Minimizar treino" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="label" numberOfLines={1}>
            {session.name}
          </Text>
          <Text variant="h2" tabular color={paused ? 'warning' : 'text'} accessibilityLabel={`Tempo de treino ${formatClock(elapsed)}`}>
            {formatClock(elapsed)}
          </Text>
        </View>
        <IconButton
          icon={paused ? 'play' : 'pause'}
          tone={paused ? 'primary' : 'default'}
          label={paused ? 'Continuar treino' : 'Pausar treino'}
          onPress={() => (paused ? activeWorkout.resume() : activeWorkout.pause())}
          testID="session-pause"
        />
      </View>

      <View style={[styles.statsBar, { backgroundColor: colors.surface }]}>
        <Stat label="Séries" value={`${totals.completedSets}/${sets.length}`} />
        <Stat label="Repetições" value={String(totals.totalReps)} />
        <Stat label="Volume" value={`${formatNumber(totals.volumeKg, 0)} kg`} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + 220 }}>
        <SyncBanner />
        {paused ? (
          <Text variant="bodySm" color="warning" align="center">
            Treino pausado. O tempo não está sendo contado.
          </Text>
        ) : null}
        {exercises.length === 0 ? (
          <EmptyState icon="add-circle-outline" title="Adicione exercícios" message="Escolha os exercícios na biblioteca e registre suas séries." />
        ) : (
          exercises.map((ex, i) => (
            <SessionExerciseCard key={ex.id} item={ex} index={i} sessionId={session.id} sets={sets.filter((s) => s.session_exercise_id === ex.id)} />
          ))
        )}
        <Button title="Adicionar exercício" icon="add" variant="outline" onPress={addExercises} testID="session-add-exercise" />
        <Button title="Descartar treino" icon="trash-outline" variant="ghost" onPress={discard} />
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
        <RestTimer />
        <Button title="Finalizar treino" icon="flag" size="lg" loading={finishing} onPress={finish} testID="session-finish" />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="label" tabular>
        {value}
      </Text>
      <Text variant="caption" color="textSubtle">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  statsBar: { flexDirection: 'row', paddingVertical: spacing.sm },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.md },
});
