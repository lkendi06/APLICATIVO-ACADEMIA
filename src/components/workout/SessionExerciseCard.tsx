import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { ExerciseMedia } from '@/components/exercise/ExerciseMedia';
import { Button, Card, IconButton, Text } from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { MUSCLE_LABEL } from '@/constants/muscles';
import { usePreviousSets } from '@/hooks/queries';
import { activeWorkout, type ActiveExercise } from '@/services/activeWorkout';
import { spacing } from '@/theme/tokens';
import type { WorkoutSet } from '@/types/database';
import { formatDate, formatNumber } from '@/utils/format';
import { computeTotals } from '@/utils/workout';

import { SetHeader, SetRow } from './SetRow';

type Props = { item: ActiveExercise; sets: WorkoutSet[]; sessionId: string; index: number };

export function SessionExerciseCard({ item, sets, sessionId, index }: Props) {
  const { confirm } = useFeedback();
  const previous = usePreviousSets(item.exercise_id, sessionId);
  const prev = previous.data ?? [];
  const totals = computeTotals(sets);
  const prevTotals = computeTotals(prev.map((p) => ({ ...p, completed: true })));

  const removeExercise = async () => {
    const ok = await confirm({
      title: 'Remover exercício?',
      message: `${item.exercise.name} e suas séries serão removidos deste treino.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (ok) activeWorkout.removeExercise(item.id);
  };

  const deleteSet = async (s: WorkoutSet) => {
    if (s.completed) {
      const ok = await confirm({
        title: 'Excluir série concluída?',
        message: `A série ${s.set_number} (${formatNumber(s.weight_kg, 1)} kg × ${s.reps}) será apagada.`,
        confirmLabel: 'Excluir',
        destructive: true,
      });
      if (!ok) return;
    }
    activeWorkout.deleteSet(s.id);
  };

  return (
    <Animated.View layout={LinearTransition} entering={FadeIn}>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Ver demonstração de ${item.exercise.name}`} onPress={() => router.push(`/exercises/${item.exercise_id}`)}>
            <ExerciseMedia mediaKey={item.exercise.media_key} mediaUrl={item.exercise.media_url} name={item.exercise.name} size={56} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" numberOfLines={2}>
              {index + 1}. {item.exercise.name}
            </Text>
            <Text variant="caption" color="textMuted">
              {MUSCLE_LABEL[item.exercise.primary_muscle]} · descanso {item.rest_seconds}s
            </Text>
          </View>
          <IconButton icon="trash-outline" size={34} tone="danger" label={`Remover ${item.exercise.name}`} onPress={removeExercise} />
        </View>

        {prev.length ? (
          <Text variant="caption" color="textSubtle">
            Última vez ({formatDate(prev[0].started_at, { day: '2-digit', month: 'short' })}): {prev.map((p) => `${formatNumber(p.weight_kg, 1)}×${p.reps}`).join(', ')}
          </Text>
        ) : null}

        <SetHeader timed={item.exercise.is_timed} />
        {sets.map((s) => (
          <SetRow
            key={s.id}
            set={s}
            timed={item.exercise.is_timed}
            previous={prev.find((p) => p.set_number === s.set_number)}
            onChange={(patch) => activeWorkout.updateSet(s.id, patch)}
            onDelete={() => deleteSet(s)}
            onCompleted={() => item.rest_seconds > 0 && activeWorkout.startRest(item.rest_seconds, item.exercise.name)}
          />
        ))}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button title="Adicionar série" icon="add" size="sm" variant="ghost" onPress={() => activeWorkout.addSet(item.id)} />
          {totals.completedSets > 0 ? (
            <Text variant="caption" color="textMuted">
              {formatNumber(totals.volumeKg, 0)} kg
              {prevTotals.volumeKg > 0
                ? ` (${totals.volumeKg >= prevTotals.volumeKg ? '▲' : '▼'} ${formatNumber(Math.abs(totals.volumeKg - prevTotals.volumeKg), 0)} vs última)`
                : ''}
            </Text>
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
}
