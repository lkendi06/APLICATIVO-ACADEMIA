import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Card,
  EmptyState,
  ErrorView,
  IconButton,
  ListSkeleton,
  Screen,
  Text,
} from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { useDeleteMetric, useMetrics, useUnits } from '@/hooks/queries';
import { spacing } from '@/theme/tokens';
import type { BodyMetric } from '@/types/database';
import { friendlyError } from '@/utils/errors';
import { formatDateTime, formatLength, formatNumber, formatWeight } from '@/utils/format';

export default function MetricsHistory() {
  const metrics = useMetrics();
  const del = useDeleteMetric();
  const units = useUnits();
  const { confirm, toast } = useFeedback();

  const describe = (m: BodyMetric) =>
    [
      m.weight_kg != null && `Peso ${formatWeight(m.weight_kg, units.weight)}`,
      m.height_cm != null && `Altura ${formatLength(m.height_cm, units.length)}`,
      m.waist_cm != null && `Abdômen ${formatLength(m.waist_cm, units.length)}`,
      m.chest_cm != null && `Peito ${formatLength(m.chest_cm, units.length)}`,
      m.arm_cm != null && `Braço ${formatLength(m.arm_cm, units.length)}`,
      m.hip_cm != null && `Quadril ${formatLength(m.hip_cm, units.length)}`,
      m.thigh_cm != null && `Coxa ${formatLength(m.thigh_cm, units.length)}`,
      m.body_fat_pct != null && `Gordura ${formatNumber(m.body_fat_pct, 1)}%`,
    ]
      .filter(Boolean)
      .join(' · ');

  const onDelete = async (m: BodyMetric) => {
    const ok = await confirm({
      title: 'Excluir medição?',
      message: `Registro de ${formatDateTime(m.measured_at)} será apagado.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    del.mutate(m.id, {
      onSuccess: () => toast('Medição excluída.'),
      onError: (e) => toast(friendlyError(e), 'error'),
    });
  };

  return (
    <Screen
      back
      title="Todas as medições"
      refreshing={metrics.isRefetching}
      onRefresh={metrics.refetch}>
      {metrics.isLoading ? (
        <ListSkeleton />
      ) : metrics.error ? (
        <ErrorView error={metrics.error} onRetry={metrics.refetch} />
      ) : !metrics.data?.length ? (
        <EmptyState
          icon="list-outline"
          title="Sem medições"
          message="Suas medições aparecem aqui em ordem cronológica."
          actionLabel="Adicionar"
          onAction={() => router.push('/metrics/new')}
        />
      ) : (
        metrics.data.map((m) => (
          <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">{formatDateTime(m.measured_at)}</Text>
              <Text variant="caption" color="textMuted">
                {describe(m)}
              </Text>
              {m.notes ? (
                <Text variant="caption" color="textSubtle">
                  {m.notes}
                </Text>
              ) : null}
            </View>
            <IconButton
              icon="create-outline"
              size={34}
              label="Editar medição"
              onPress={() => router.push({ pathname: '/metrics/new', params: { id: m.id } })}
            />
            <IconButton
              icon="trash-outline"
              size={34}
              tone="danger"
              label="Excluir medição"
              onPress={() => onDelete(m)}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
