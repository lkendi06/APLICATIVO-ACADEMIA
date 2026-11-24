import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LineChart } from '@/components/charts/LineChart';
import {
  Badge,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  IconButton,
  ListSkeleton,
  Screen,
  SectionHeader,
  Segmented,
  StatTile,
  Text,
} from '@/components/ui';
import { useMetrics, useProfile, useUnits } from '@/hooks/queries';
import { useBodyStats } from '@/hooks/useBodyStats';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import { RANGE_OPTIONS, rangeFor, type RangeKey } from '@/utils/dates';
import {
  formatDate,
  formatFixed,
  formatLength,
  formatNumber,
  formatWeight,
  fromKg,
} from '@/utils/format';

const MEASURES = [
  { key: 'waist', label: 'Abdômen', field: 'waist_cm' },
  { key: 'chest', label: 'Peito', field: 'chest_cm' },
  { key: 'arm', label: 'Braço', field: 'arm_cm' },
  { key: 'hip', label: 'Quadril', field: 'hip_cm' },
  { key: 'thigh', label: 'Coxa', field: 'thigh_cm' },
] as const;

export default function MetricsTab() {
  const { colors } = useTheme();
  const units = useUnits();
  const metrics = useMetrics();
  const profile = useProfile();
  const stats = useBodyStats(metrics.data, profile.data?.birth_date);
  const [range, setRange] = useState<Exclude<RangeKey, 'custom'>>('3m');

  const weightSeries = useMemo(() => {
    const { from } = rangeFor(range);
    return (metrics.data ?? [])
      .filter((m) => m.weight_kg != null && new Date(m.measured_at) >= from)
      .map((m) => ({ x: new Date(m.measured_at), y: fromKg(m.weight_kg!, units.weight) }));
  }, [metrics.data, range, units.weight]);

  const empty = !metrics.isLoading && (metrics.data ?? []).length === 0;

  return (
    <Screen
      title="Métricas"
      subtitle="Peso, medidas e indicadores"
      largeTitle
      tabBarSpace
      refreshing={metrics.isRefetching}
      onRefresh={metrics.refetch}
      right={
        <IconButton
          icon="add"
          tone="primary"
          label="Nova medição"
          onPress={() => router.push('/metrics/new')}
          testID="metrics-new"
        />
      }>
      {metrics.isLoading ? (
        <ListSkeleton rows={3} height={110} />
      ) : metrics.error ? (
        <ErrorView error={metrics.error} onRetry={metrics.refetch} />
      ) : empty ? (
        <EmptyState
          icon="body-outline"
          title="Registre sua primeira medição"
          message="Informe peso e altura para calcular seu IMC e acompanhar a evolução. As medidas extras são opcionais."
          actionLabel="Adicionar medição"
          onAction={() => router.push('/metrics/new')}
        />
      ) : (
        <>
          <View style={styles.grid}>
            <StatTile
              label="Peso"
              icon="scale-outline"
              value={formatWeight(stats.weight, units.weight)}
              hint={
                stats.latest.weight ? formatDate(stats.latest.weight.measured_at) : 'Não informado'
              }
            />
            <StatTile
              label="Altura"
              icon="resize-outline"
              value={stats.height ? formatLength(stats.height, units.length) : '—'}
              hint={stats.height ? undefined : 'Informe para o IMC'}
            />
          </View>

          <Animated.View entering={FadeInDown.duration(300)}>
            <Card
              onPress={() => router.push('/metrics/bmi')}
              accessibilityLabel="Ver detalhes do IMC"
              style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text variant="overline" color="textMuted">
                  Índice de massa corporal
                </Text>
                <Icon name="chevron-forward" size={18} color="textSubtle" />
              </View>
              {stats.bmi != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
                  <Text variant="display" tabular>
                    {formatFixed(stats.bmi, 2)}
                  </Text>
                  {stats.category ? (
                    <View style={{ paddingBottom: 6 }}>
                      <Badge label={stats.category.label} tone={stats.category.tone} />
                    </View>
                  ) : (
                    <Text variant="caption" color="textMuted" style={{ paddingBottom: 8 }}>
                      Classificação adulta não se aplica
                    </Text>
                  )}
                </View>
              ) : (
                <Text color="textMuted">Informe peso e altura para calcular.</Text>
              )}
            </Card>
          </Animated.View>

          <View style={styles.grid}>
            <Feature
              icon="body-outline"
              label="Simulador corporal"
              onPress={() => router.push('/metrics/body')}
            />
            <Feature
              icon="trophy-outline"
              label="Objetivos"
              onPress={() => router.push('/goals')}
            />
            <Feature
              icon="list-outline"
              label="Todas as medições"
              onPress={() => router.push('/metrics/history')}
            />
            <Feature
              icon="stats-chart-outline"
              label="Evolução"
              onPress={() => router.push({ pathname: '/history', params: { tab: 'body' } })}
            />
          </View>

          <SectionHeader title="Evolução do peso" />
          <Card style={{ gap: spacing.md }}>
            <Segmented
              scrollable
              options={
                RANGE_OPTIONS.filter((r) => r.key !== 'custom') as {
                  key: Exclude<RangeKey, 'custom'>;
                  label: string;
                }[]
              }
              value={range}
              onChange={setRange}
            />
            {weightSeries.length >= 1 ? (
              <LineChart
                data={weightSeries}
                unit={units.weight}
                accessibilityLabel="Gráfico de evolução do peso"
              />
            ) : (
              <Text variant="bodySm" color="textMuted">
                Nenhum peso registrado neste período.
              </Text>
            )}
          </Card>

          <SectionHeader
            title="Medidas corporais"
            action="Atualizar"
            onAction={() => router.push('/metrics/new')}
          />
          <View style={styles.grid}>
            {MEASURES.map((m) => {
              const rec = stats.latest[m.key];
              return (
                <StatTile
                  key={m.key}
                  label={m.label}
                  value={rec ? formatLength(rec[m.field], units.length) : '—'}
                  hint={rec ? formatDate(rec.measured_at) : 'Opcional'}
                />
              );
            })}
            <StatTile
              label="Gordura corporal"
              value={
                stats.latest.bodyFat
                  ? `${formatNumber(stats.latest.bodyFat.body_fat_pct, 1)}%`
                  : '—'
              }
              hint={
                stats.latest.bodyFat ? formatDate(stats.latest.bodyFat.measured_at) : 'Se souber'
              }
            />
          </View>
          <Text variant="caption" color="textSubtle">
            Cada medição é salva com data e hora. Os registros anteriores nunca são sobrescritos.
          </Text>
        </>
      )}
      <View style={{ height: 1, backgroundColor: colors.border, opacity: 0 }} />
    </Screen>
  );
}

function Feature({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.feature,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Icon name={icon} size={20} color="primaryText" />
      <Text variant="label" style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  feature: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
