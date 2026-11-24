import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Button,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  IconButton,
  ListSkeleton,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { MUSCLE_LABEL } from '@/constants/muscles';
import { useDeletePlan, useDuplicatePlan, usePlans } from '@/hooks/queries';
import type { PlanWithItems } from '@/services/api';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

export default function Workouts() {
  const plans = usePlans();
  return (
    <Screen
      title="Treinos"
      subtitle="Suas divisões e rotinas"
      largeTitle
      tabBarSpace
      refreshing={plans.isRefetching}
      onRefresh={plans.refetch}
      right={
        <IconButton
          icon="add"
          tone="primary"
          label="Novo treino"
          onPress={() => router.push('/workouts/new')}
          testID="workouts-new"
        />
      }>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          title="Exercícios"
          icon="library-outline"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/exercises')}
        />
        <Button
          title="Histórico"
          icon="time-outline"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/history')}
        />
      </View>

      {plans.isLoading ? (
        <ListSkeleton rows={3} height={110} />
      ) : plans.error ? (
        <ErrorView error={plans.error} onRetry={plans.refetch} />
      ) : (plans.data ?? []).length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title="Nenhum treino ainda"
          message="Monte sua divisão (ex.: Treino A — Peito e tríceps) escolhendo exercícios, séries, repetições e descanso."
          actionLabel="Criar treino"
          onAction={() => router.push('/workouts/new')}
        />
      ) : (
        <>
          <SectionHeader title={`${plans.data!.length} treino(s)`} />
          {plans.data!.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(i * 50).duration(300)}>
              <PlanCard plan={p} index={i} />
            </Animated.View>
          ))}
        </>
      )}
    </Screen>
  );
}

function PlanCard({ plan, index }: { plan: PlanWithItems; index: number }) {
  const { colors } = useTheme();
  const { confirm, toast } = useFeedback();
  const del = useDeletePlan();
  const dup = useDuplicatePlan();
  const letter = String.fromCharCode(65 + (index % 26));
  const accent = plan.color ?? colors.primary;

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Excluir treino?',
      message: `"${plan.name}" será removido. O histórico de sessões já realizadas é mantido.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    del.mutate(plan.id, {
      onSuccess: () => toast('Treino excluído.'),
      onError: (e) => toast(friendlyError(e), 'error'),
    });
  };

  return (
    <Card
      onPress={() => router.push(`/workouts/${plan.id}`)}
      accessibilityLabel={`Treino ${plan.name}`}
      style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={[styles.letter, { backgroundColor: accent }]}>
          <Text variant="h3" style={{ color: colors.onPrimary }}>
            {letter}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3" numberOfLines={1}>
            {plan.name}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {plan.muscle_groups.length
              ? plan.muscle_groups.map((m) => MUSCLE_LABEL[m]).join(' · ')
              : 'Sem grupos definidos'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Meta icon="list-outline" text={`${plan.items.length} exercícios`} />
        <Meta
          icon="layers-outline"
          text={`${plan.items.reduce((a, i) => a + i.target_sets, 0)} séries`}
        />
        <View style={{ flex: 1 }} />
        <IconButton
          icon="copy-outline"
          size={34}
          label="Duplicar treino"
          onPress={() =>
            dup.mutate(plan.id, {
              onSuccess: () => toast('Treino duplicado.'),
              onError: (e) => toast(friendlyError(e), 'error'),
            })
          }
        />
        <IconButton
          icon="trash-outline"
          size={34}
          tone="danger"
          label="Excluir treino"
          onPress={onDelete}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Iniciar ${plan.name}`}
          onPress={() => router.push({ pathname: '/log', params: { planId: plan.id } })}
          style={[styles.play, { backgroundColor: colors.primary }]}>
          <Icon name="play" size={16} color={colors.onPrimary} />
        </Pressable>
      </View>
    </Card>
  );
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={14} color="textSubtle" />
      <Text variant="caption" color="textMuted">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  letter: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
