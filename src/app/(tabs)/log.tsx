import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SyncBanner } from '@/components/SyncBanner';
import { Button, Card, EmptyState, Icon, ListSkeleton, Screen, SectionHeader, Text, TextField } from '@/components/ui';
import { useUserId } from '@/contexts/AuthContext';
import { useFeedback } from '@/contexts/FeedbackContext';
import { MUSCLE_LABEL } from '@/constants/muscles';
import { usePlans } from '@/hooks/queries';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { activeWorkout } from '@/services/activeWorkout';
import { exerciseApi, type PlanWithItems } from '@/services/api';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';
import { elapsedSeconds } from '@/utils/workout';
import { formatClock, formatDate } from '@/utils/format';

export default function LogTab() {
  const userId = useUserId();
  const active = useActiveWorkout();
  const plans = usePlans();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { toast } = useFeedback();
  const [starting, setStarting] = useState<string | null>(null);
  const [freeName, setFreeName] = useState('');
  const autoStarted = useRef<string | null>(null);

  const start = async (plan: PlanWithItems | null) => {
    if (activeWorkout.get()) {
      router.push(`/session/${activeWorkout.get()!.session.id}`);
      return;
    }
    setStarting(plan?.id ?? 'free');
    try {
      let lastWeights: Record<string, number> = {};
      if (plan) {
        lastWeights = await exerciseApi.lastWeights(plan.items.map((i) => i.exercise_id)).catch(() => ({}));
      }
      const name = plan?.name ?? (freeName.trim() || `Treino livre · ${formatDate(new Date(), { day: '2-digit', month: '2-digit' })}`);
      const session = await activeWorkout.start({ userId, name, plan, lastWeights });
      router.push(`/session/${session.id}`);
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setStarting(null);
    }
  };

  // Atalho vindo do Início/Treinos: ?planId=...
  useEffect(() => {
    if (!planId || autoStarted.current === planId || !plans.data) return;
    const plan = plans.data.find((p) => p.id === planId);
    if (!plan) return;
    autoStarted.current = planId;
    router.setParams({ planId: undefined });
    start(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, plans.data]);

  if (active) {
    const done = active.sets.filter((s) => s.completed).length;
    return (
      <Screen title="Registrar" largeTitle tabBarSpace>
        <SyncBanner />
        <Card tone="primary" style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="pulse" size={20} color="danger" />
            <Text variant="label" color="danger">
              {active.session.paused_at ? 'Treino pausado' : 'Treino em andamento'}
            </Text>
          </View>
          <Text variant="h2">{active.session.name}</Text>
          <Text color="textMuted">
            {formatClock(elapsedSeconds(active.session))} · {done}/{active.sets.length} séries concluídas
          </Text>
          <Button title="Voltar ao treino" icon="play" size="lg" onPress={() => router.push(`/session/${active.session.id}`)} testID="log-resume" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Registrar treino" subtitle="Escolha um treino ou comece do zero" largeTitle tabBarSpace>
      <SyncBanner />
      <Card style={{ gap: spacing.md }}>
        <Text variant="h3">Treino livre</Text>
        <Text variant="bodySm" color="textMuted">
          Adicione os exercícios durante o treino.
        </Text>
        <TextField label="Nome (opcional)" placeholder="Ex.: Treino de sexta" value={freeName} onChangeText={setFreeName} maxLength={80} />
        <Button title="Começar treino livre" icon="flash" loading={starting === 'free'} disabled={!!starting} onPress={() => start(null)} testID="log-free" />
      </Card>

      <SectionHeader title="Meus treinos" action="Novo" onAction={() => router.push('/workouts/new')} />
      {plans.isLoading ? (
        <ListSkeleton rows={3} />
      ) : (plans.data ?? []).length === 0 ? (
        <EmptyState compact icon="barbell-outline" title="Sem treinos salvos" message="Crie um treino para iniciar com séries e cargas já configuradas." actionLabel="Criar treino" onAction={() => router.push('/workouts/new')} />
      ) : (
        plans.data!.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 40)}>
            <Card style={{ gap: spacing.sm }}>
              <Text variant="h3">{p.name}</Text>
              <Text variant="caption" color="textMuted">
                {p.items.length} exercícios · {p.muscle_groups.map((m) => MUSCLE_LABEL[m]).join(', ') || '—'}
              </Text>
              <Button
                title="Iniciar"
                icon="play"
                size="sm"
                style={{ alignSelf: 'flex-start' }}
                loading={starting === p.id}
                disabled={!!starting || p.items.length === 0}
                onPress={() => start(p)}
              />
            </Card>
          </Animated.View>
        ))
      )}
    </Screen>
  );
}
