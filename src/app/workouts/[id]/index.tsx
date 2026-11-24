import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ExerciseMedia } from '@/components/exercise/ExerciseMedia';
import {
  Button,
  Card,
  Chip,
  ErrorView,
  IconButton,
  ListSkeleton,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { MUSCLE_LABEL } from '@/constants/muscles';
import { useDeletePlan, useDuplicatePlan, usePlan, useSessionStats, useUnits } from '@/hooks/queries';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';
import { formatDate, formatWeight } from '@/utils/format';

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id);
  const units = useUnits();
  const sessions = useSessionStats({ limit: 50 });
  const del = useDeletePlan();
  const dup = useDuplicatePlan();
  const { confirm, toast } = useFeedback();
  const lastDone = sessions.data?.find((s) => s.plan_id === id);

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Excluir treino?',
      message: 'O histórico de sessões já realizadas será mantido.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    del.mutate(id, {
      onSuccess: () => {
        toast('Treino excluído.');
        router.back();
      },
      onError: (e) => toast(friendlyError(e), 'error'),
    });
  };

  return (
    <Screen
      back
      title={plan.data?.name ?? 'Treino'}
      right={<IconButton icon="create-outline" label="Editar treino" onPress={() => router.push(`/workouts/${id}/edit`)} />}
      footer={
        plan.data ? (
          <Button
            title="Iniciar este treino"
            icon="play"
            size="lg"
            onPress={() => router.push({ pathname: '/log', params: { planId: id } })}
            testID="plan-start"
          />
        ) : undefined
      }>
      {plan.isLoading ? (
        <ListSkeleton />
      ) : plan.error || !plan.data ? (
        <ErrorView error={plan.error} onRetry={plan.refetch} />
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            <Text variant="h1">{plan.data.name}</Text>
            {plan.data.description ? <Text color="textMuted">{plan.data.description}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {plan.data.muscle_groups.map((m) => (
                <Chip key={m} label={MUSCLE_LABEL[m]} />
              ))}
            </View>
            <Text variant="caption" color="textSubtle">
              {lastDone ? `Último treino: ${formatDate(lastDone.started_at)}` : 'Ainda não realizado'}
            </Text>
          </View>

          <SectionHeader title={`${plan.data.items.length} exercícios`} />
          {plan.data.items.map((item, i) => (
            <Card key={item.id} onPress={() => router.push(`/exercises/${item.exercise_id}`)} accessibilityLabel={item.exercise.name}>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <ExerciseMedia mediaKey={item.exercise.media_key} mediaUrl={item.exercise.media_url} name={item.exercise.name} animated={false} size={56} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyMedium">
                    {i + 1}. {item.exercise.name}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {item.target_sets} × {item.target_reps}
                    {item.target_weight_kg ? ` · ${formatWeight(item.target_weight_kg, units.weight)}` : ''} · descanso{' '}
                    {item.rest_seconds}s
                  </Text>
                </View>
              </View>
            </Card>
          ))}

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              title="Duplicar"
              icon="copy-outline"
              variant="secondary"
              style={{ flex: 1 }}
              loading={dup.isPending}
              onPress={() =>
                dup.mutate(id, {
                  onSuccess: (newId) => {
                    toast('Treino duplicado.');
                    router.replace(`/workouts/${newId}/edit`);
                  },
                  onError: (e) => toast(friendlyError(e), 'error'),
                })
              }
            />
            <Button title="Excluir" icon="trash-outline" variant="danger" style={{ flex: 1 }} onPress={onDelete} />
          </View>
        </>
      )}
    </Screen>
  );
}
