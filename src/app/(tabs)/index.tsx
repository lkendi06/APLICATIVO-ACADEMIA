import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BarChart } from '@/components/charts/BarChart';
import { AvatarImage } from '@/components/AvatarImage';
import { SyncBanner } from '@/components/SyncBanner';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  ListSkeleton,
  ProgressRing,
  Screen,
  SectionHeader,
  StatTile,
  Text,
} from '@/components/ui';
import { MUSCLE_LABEL } from '@/constants/muscles';
import { useMetrics, usePlans, useProfile, useSessionStats, useUnits } from '@/hooks/queries';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import { startOfWeek, WEEKDAY_SHORT, weekActivity } from '@/utils/dates';
import {
  firstName,
  formatDate,
  formatDuration,
  formatLongToday,
  formatNumber,
  formatWeight,
  greeting,
} from '@/utils/format';
import { percentChange } from '@/utils/workout';

export default function Dashboard() {
  const { colors } = useTheme();
  const units = useUnits();
  const profile = useProfile();
  const active = useActiveWorkout();
  const since = useMemo(() => {
    const d = startOfWeek();
    d.setDate(d.getDate() - 7 * 7);
    return d;
  }, []);
  const sessions = useSessionStats({ from: since });
  const plans = usePlans();
  const metrics = useMetrics();

  const refreshing = sessions.isRefetching || metrics.isRefetching || profile.isRefetching;
  const onRefresh = () => {
    sessions.refetch();
    metrics.refetch();
    profile.refetch();
    plans.refetch();
  };

  const weekStart = startOfWeek();
  const list = sessions.data ?? [];
  const thisWeek = list.filter((s) => new Date(s.started_at) >= weekStart);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const lastWeek = list.filter((s) => {
    const d = new Date(s.started_at);
    return d >= prevWeekStart && d < weekStart;
  });
  const weeklyGoal = profile.data?.weekly_workout_goal ?? 3;
  const activity = weekActivity(thisWeek.map((s) => s.started_at));
  const lastSession = list[0];
  const volumeThis = thisWeek.reduce((a, s) => a + s.total_volume_kg, 0);
  const volumeLast = lastWeek.reduce((a, s) => a + s.total_volume_kg, 0);
  const volumeTrend = percentChange(volumeThis, volumeLast);

  // Últimas 8 semanas (treinos por semana)
  const weeklyBars = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(weekStart);
    start.setDate(start.getDate() - 7 * (7 - i));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = list.filter((s) => {
      const d = new Date(s.started_at);
      return d >= start && d < end;
    }).length;
    return {
      label: i === 7 ? 'Atual' : `${start.getDate()}/${start.getMonth() + 1}`,
      value: count,
      highlight: i === 7,
    };
  });

  const weights = (metrics.data ?? []).filter((m) => m.weight_kg != null);
  const latestWeight = weights[0];
  const [monthAgo] = useState(() => Date.now() - 30 * 86_400_000);
  const weightBaseline =
    weights.find((m) => new Date(m.measured_at).getTime() <= monthAgo) ??
    weights[weights.length - 1];
  const weightDelta =
    latestWeight && weightBaseline && latestWeight.id !== weightBaseline.id
      ? latestWeight.weight_kg! - weightBaseline.weight_kg!
      : null;

  // Sugestão do treino do dia: próximo plano na sequência após o último realizado.
  const planList = plans.data ?? [];
  const lastPlanIdx = planList.findIndex((p) => p.id === lastSession?.plan_id);
  const suggested = planList.length ? planList[(lastPlanIdx + 1) % planList.length] : null;

  const loading = profile.isLoading || sessions.isLoading;
  const isEmpty = !loading && list.length === 0 && planList.length === 0 && !active;

  return (
    <Screen tabBarSpace refreshing={refreshing} onRefresh={onRefresh}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="textMuted">
            {formatLongToday()}
          </Text>
          <Text variant="h1" numberOfLines={1}>
            {greeting()}, {firstName(profile.data?.full_name)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          onPress={() => router.push('/profile')}>
          <AvatarImage path={profile.data?.avatar_path} name={profile.data?.full_name} size={46} />
        </Pressable>
      </Animated.View>

      <SyncBanner />

      {loading ? (
        <ListSkeleton rows={3} height={120} />
      ) : isEmpty ? (
        <EmptyState
          icon="flash-outline"
          title="Vamos começar?"
          message="Crie seu primeiro treino ou registre um treino livre agora mesmo. Seus gráficos e indicadores aparecem aqui."
          actionLabel="Criar meu primeiro treino"
          onAction={() => router.push('/workouts/new')}
        />
      ) : null}

      {/* Treino do dia */}
      {!loading && (active || suggested) ? (
        <Animated.View entering={FadeInDown.delay(60).duration(350)}>
          <Card tone={active ? 'primary' : 'default'} style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Badge
                label={active ? 'Em andamento' : 'Treino do dia'}
                tone={active ? 'danger' : 'primary'}
              />
              <View style={{ flex: 1 }} />
              {!active && suggested ? (
                <Text variant="caption" color="textMuted">
                  {suggested.items.length} exercícios
                </Text>
              ) : null}
            </View>
            <Text variant="h2">{active ? active.session.name : suggested?.name}</Text>
            {!active && suggested?.muscle_groups.length ? (
              <Text variant="bodySm" color="textMuted">
                {suggested.muscle_groups.map((m) => MUSCLE_LABEL[m]).join(' · ')}
              </Text>
            ) : null}
            {active ? (
              <Text variant="bodySm" color="textMuted">
                {active.sets.filter((s) => s.completed).length} de {active.sets.length} séries
                concluídas
              </Text>
            ) : null}
            <Button
              title={active ? 'Continuar treino' : 'Iniciar treino'}
              icon={active ? 'play' : 'flash'}
              onPress={() =>
                active
                  ? router.push(`/session/${active.session.id}`)
                  : router.push({ pathname: '/log', params: { planId: suggested!.id } })
              }
              testID="dashboard-start"
            />
          </Card>
        </Animated.View>
      ) : null}

      {!loading && !isEmpty ? (
        <>
          {/* Objetivo semanal */}
          <Animated.View entering={FadeInDown.delay(120).duration(350)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <ProgressRing progress={thisWeek.length / weeklyGoal} size={84}>
                <Text variant="h2" tabular>
                  {thisWeek.length}
                  <Text variant="bodySm" color="textMuted">
                    /{weeklyGoal}
                  </Text>
                </Text>
              </ProgressRing>
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Text variant="h3">Objetivo semanal</Text>
                <Text variant="caption" color="textMuted">
                  {thisWeek.length >= weeklyGoal
                    ? 'Meta da semana batida! 🎉'
                    : `Faltam ${weeklyGoal - thisWeek.length} treino(s) para a meta.`}
                </Text>
                <View style={styles.weekRow}>
                  {WEEKDAY_SHORT.map((d, i) => (
                    <View key={d} style={{ alignItems: 'center', gap: 4 }}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: activity[i] ? colors.primary : colors.surfaceAlt },
                        ]}
                        accessibilityLabel={`${d}: ${activity[i] ? 'treinou' : 'sem treino'}`}
                      />
                      <Text variant="caption" color="textSubtle" style={{ fontSize: 10 }}>
                        {d[0]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Indicadores */}
          <View style={styles.grid}>
            <StatTile
              label="Peso atual"
              icon="scale-outline"
              value={latestWeight ? formatWeight(latestWeight.weight_kg, units.weight) : '—'}
              trend={
                weightDelta != null
                  ? {
                      value: `${weightDelta > 0 ? '+' : ''}${formatNumber(weightDelta, 1)} kg em 30 dias`,
                      positive:
                        profile.data?.fitness_goal === 'gain_muscle'
                          ? weightDelta >= 0
                          : weightDelta <= 0,
                    }
                  : null
              }
              hint={latestWeight ? formatDate(latestWeight.measured_at) : 'Registre seu peso'}
            />
            <StatTile
              label="Volume na semana"
              icon="barbell-outline"
              value={`${formatNumber(volumeThis, 0)} kg`}
              trend={
                volumeTrend != null
                  ? {
                      value: `${volumeTrend > 0 ? '+' : ''}${formatNumber(volumeTrend, 1)}% vs semana passada`,
                      positive: volumeTrend >= 0,
                    }
                  : null
              }
              hint="Carga × repetições"
            />
          </View>

          {/* Último treino */}
          {lastSession ? (
            <>
              <SectionHeader
                title="Último treino"
                action="Histórico"
                onAction={() => router.push('/history')}
              />
              <Card
                onPress={() => router.push(`/session/summary/${lastSession.session_id}`)}
                accessibilityLabel={`Último treino: ${lastSession.name}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={[styles.iconBox, { backgroundColor: colors.accentSoft }]}>
                    <Icon name="checkmark-done" size={22} color="accent" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{lastSession.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {formatDate(lastSession.started_at)} ·{' '}
                      {formatDuration(lastSession.duration_seconds)} · {lastSession.completed_sets}{' '}
                      séries · {formatNumber(lastSession.total_volume_kg, 0)} kg
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color="textSubtle" />
                </View>
              </Card>
            </>
          ) : null}

          {/* Progresso */}
          <SectionHeader title="Treinos por semana" />
          <Card>
            <BarChart
              data={weeklyBars}
              accessibilityLabel="Treinos por semana nas últimas 8 semanas"
            />
          </Card>

          {/* Atalhos */}
          <SectionHeader title="Atalhos" />
          <View style={styles.grid}>
            <Shortcut
              icon="add-circle-outline"
              label="Treino livre"
              onPress={() => router.push('/log')}
            />
            <Shortcut
              icon="scale-outline"
              label="Registrar peso"
              onPress={() => router.push('/metrics/new')}
            />
            <Shortcut
              icon="library-outline"
              label="Exercícios"
              onPress={() => router.push('/exercises')}
            />
            <Shortcut
              icon="trophy-outline"
              label="Objetivos"
              onPress={() => router.push('/goals')}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Shortcut({
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
        styles.shortcut,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Icon name={icon} size={22} color="primaryText" />
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcut: {
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
