import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import {
  Card,
  Chip,
  EmptyState,
  ErrorView,
  Icon,
  ListSkeleton,
  Screen,
  SectionHeader,
  Segmented,
  StatTile,
  Text,
  TextField,
} from '@/components/ui';
import {
  useExerciseProgress,
  useMetrics,
  useProfile,
  useSessionStats,
  useTrainedExercises,
  useUnits,
} from '@/hooks/queries';
import { bmiSeries } from '@/hooks/useBodyStats';
import { spacing } from '@/theme/tokens';
import type { BodyMetric } from '@/types/database';
import { RANGE_OPTIONS, rangeFor, type DateRange, type RangeKey } from '@/utils/dates';
import { formatDate, formatDuration, formatNumber, fromCm, fromKg } from '@/utils/format';

type Tab = 'workouts' | 'exercises' | 'body';

function parseBr(s: string, end = false): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  if (d.getDate() !== +m[1]) return null;
  if (end) d.setHours(23, 59, 59, 999);
  return d;
}

export default function HistoryScreen() {
  const params = useLocalSearchParams<{ tab?: Tab; exerciseId?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'workouts');
  const [rangeKey, setRangeKey] = useState<RangeKey>('3m');
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');

  const range: DateRange | null = useMemo(() => {
    if (rangeKey !== 'custom') return rangeFor(rangeKey);
    const from = parseBr(fromText);
    const to = parseBr(toText, true);
    return from && to && from <= to ? { from, to } : null;
  }, [rangeKey, fromText, toText]);

  return (
    <Screen back title="Histórico e evolução">
      <Segmented
        options={[
          { key: 'workouts', label: 'Treinos' },
          { key: 'exercises', label: 'Exercícios' },
          { key: 'body', label: 'Corpo' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Segmented scrollable options={RANGE_OPTIONS} value={rangeKey} onChange={setRangeKey} />
      {rangeKey === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="De"
              placeholder="DD/MM/AAAA"
              value={fromText}
              onChangeText={setFromText}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Até"
              placeholder="DD/MM/AAAA"
              value={toText}
              onChangeText={setToText}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      ) : null}
      {!range ? (
        <Text variant="bodySm" color="textMuted">
          Informe as duas datas no formato DD/MM/AAAA.
        </Text>
      ) : tab === 'workouts' ? (
        <WorkoutsHistory range={range} />
      ) : tab === 'exercises' ? (
        <ExercisesHistory range={range} initialExercise={params.exerciseId} />
      ) : (
        <BodyHistory range={range} />
      )}
    </Screen>
  );
}

function WorkoutsHistory({ range }: { range: DateRange }) {
  const q = useSessionStats({ from: range.from, to: range.to });
  if (q.isLoading) return <ListSkeleton />;
  if (q.error) return <ErrorView error={q.error} onRetry={q.refetch} />;
  const list = q.data ?? [];
  if (!list.length)
    return (
      <EmptyState
        compact
        icon="time-outline"
        title="Nenhum treino no período"
        message="Finalize treinos para vê-los aqui."
      />
    );

  const totalVolume = list.reduce((a, s) => a + s.total_volume_kg, 0);
  const totalTime = list.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  const asc = [...list].reverse();
  const bars = asc.slice(-12).map((s) => ({
    label: formatDate(s.started_at, { day: '2-digit', month: '2-digit' }),
    value: Math.round(s.total_volume_kg),
  }));

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatTile label="Treinos" icon="checkmark-done-outline" value={String(list.length)} />
        <StatTile label="Tempo total" icon="time-outline" value={formatDuration(totalTime)} />
        <StatTile
          label="Volume total"
          icon="barbell-outline"
          value={`${formatNumber(totalVolume / 1000, 1)} t`}
        />
      </View>
      <SectionHeader title="Volume por treino (kg)" />
      <Card>
        <BarChart
          data={bars}
          showValues={bars.length <= 8}
          accessibilityLabel="Volume por treino"
        />
      </Card>
      <SectionHeader title="Sessões" />
      {list.map((s) => (
        <Card
          key={s.session_id}
          onPress={() => router.push(`/session/summary/${s.session_id}`)}
          accessibilityLabel={`Treino ${s.name} em ${formatDate(s.started_at)}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">{s.name}</Text>
              <Text variant="caption" color="textMuted">
                {formatDate(s.started_at)} · {formatDuration(s.duration_seconds)} ·{' '}
                {s.exercise_count} exercícios · {s.completed_sets} séries · {s.total_reps} reps ·{' '}
                {formatNumber(s.total_volume_kg, 0)} kg
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color="textSubtle" />
          </View>
        </Card>
      ))}
    </>
  );
}

type ExMetric = 'max_weight_kg' | 'total_reps' | 'volume_kg' | 'estimated_1rm_kg';
const EX_METRICS: { key: ExMetric; label: string; unit: string }[] = [
  { key: 'max_weight_kg', label: 'Carga máx.', unit: 'kg' },
  { key: 'total_reps', label: 'Repetições', unit: 'reps' },
  { key: 'volume_kg', label: 'Volume', unit: 'kg' },
  { key: 'estimated_1rm_kg', label: '1RM est.', unit: 'kg' },
];

function ExercisesHistory({
  range,
  initialExercise,
}: {
  range: DateRange;
  initialExercise?: string;
}) {
  const trained = useTrainedExercises();
  const [exerciseId, setExerciseId] = useState<string | undefined>(initialExercise);
  const [metric, setMetric] = useState<ExMetric>('max_weight_kg');
  const selected = exerciseId ?? trained.data?.[0]?.id;
  const progress = useExerciseProgress(selected, range.from);

  if (trained.isLoading) return <ListSkeleton />;
  if (!trained.data?.length)
    return (
      <EmptyState
        compact
        icon="barbell-outline"
        title="Sem exercícios registrados"
        message="Conclua séries em um treino para acompanhar cargas e repetições."
      />
    );

  const rows = (progress.data ?? []).filter((p) => new Date(p.started_at) <= range.to);
  const m = EX_METRICS.find((x) => x.key === metric)!;
  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}>
        {trained.data.map((e) => (
          <Chip
            key={e.id}
            label={e.name}
            selected={e.id === selected}
            onPress={() => setExerciseId(e.id)}
          />
        ))}
      </ScrollView>
      <Segmented
        options={EX_METRICS.map(({ key, label }) => ({ key, label }))}
        value={metric}
        onChange={setMetric}
      />
      {progress.isLoading ? (
        <ListSkeleton rows={1} height={220} />
      ) : rows.length === 0 ? (
        <Text variant="bodySm" color="textMuted">
          Nenhum registro deste exercício no período.
        </Text>
      ) : (
        <>
          <Card>
            <LineChart
              data={rows.map((r) => ({ x: new Date(r.started_at), y: Number(r[metric]) }))}
              unit={m.unit}
              accessibilityLabel={`Evolução de ${m.label}`}
            />
          </Card>
          {first && last && rows.length > 1 ? (
            <Card tone="primary">
              <Text variant="bodySm">
                {m.label}: {formatNumber(Number(first[metric]), 1)} →{' '}
                <Text variant="label">
                  {formatNumber(Number(last[metric]), 1)} {m.unit}
                </Text>{' '}
                ({Number(last[metric]) >= Number(first[metric]) ? '+' : ''}
                {formatNumber(Number(last[metric]) - Number(first[metric]), 1)}) em {rows.length}{' '}
                sessões.
              </Text>
            </Card>
          ) : null}
          <SectionHeader title="Sessões" />
          {[...rows].reverse().map((r) => (
            <Card
              key={r.session_id}
              onPress={() => router.push(`/session/summary/${r.session_id}`)}>
              <Text variant="label">{formatDate(r.started_at)}</Text>
              <Text variant="caption" color="textMuted">
                {r.sets} séries · {r.total_reps} reps · máx. {formatNumber(r.max_weight_kg, 1)} kg ·
                volume {formatNumber(r.volume_kg, 0)} kg · 1RM est.{' '}
                {formatNumber(r.estimated_1rm_kg, 1)} kg
              </Text>
            </Card>
          ))}
        </>
      )}
    </>
  );
}

type BodyKey =
  'weight' | 'bmi' | 'waist_cm' | 'chest_cm' | 'arm_cm' | 'hip_cm' | 'thigh_cm' | 'body_fat_pct';
const BODY_OPTIONS: { key: BodyKey; label: string }[] = [
  { key: 'weight', label: 'Peso' },
  { key: 'bmi', label: 'IMC' },
  { key: 'waist_cm', label: 'Abdômen' },
  { key: 'chest_cm', label: 'Peito' },
  { key: 'arm_cm', label: 'Braço' },
  { key: 'hip_cm', label: 'Quadril' },
  { key: 'thigh_cm', label: 'Coxa' },
  { key: 'body_fat_pct', label: 'Gordura %' },
];

function BodyHistory({ range }: { range: DateRange }) {
  const metrics = useMetrics();
  const profile = useProfile();
  const units = useUnits();
  const [key, setKey] = useState<BodyKey>('weight');
  if (metrics.isLoading) return <ListSkeleton />;
  const inRange = (d: Date) => d >= range.from && d <= range.to;
  const all: BodyMetric[] = metrics.data ?? [];
  let data: { x: Date; y: number }[] = [];
  let unit = '';
  if (key === 'weight') {
    unit = units.weight;
    data = all
      .filter((m) => m.weight_kg != null)
      .map((m) => ({ x: new Date(m.measured_at), y: fromKg(m.weight_kg!, units.weight) }));
  } else if (key === 'bmi') {
    data = bmiSeries(all).map((p) => ({ x: p.date, y: p.bmi }));
  } else if (key === 'body_fat_pct') {
    unit = '%';
    data = all
      .filter((m) => m.body_fat_pct != null)
      .map((m) => ({ x: new Date(m.measured_at), y: m.body_fat_pct! }));
  } else {
    unit = units.length;
    data = all
      .filter((m) => m[key] != null)
      .map((m) => ({ x: new Date(m.measured_at), y: fromCm(m[key] as number, units.length) }));
  }
  data = data.filter((p) => inRange(p.x));
  void profile;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}>
        {BODY_OPTIONS.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            selected={o.key === key}
            onPress={() => setKey(o.key)}
          />
        ))}
      </ScrollView>
      {data.length === 0 ? (
        <EmptyState
          compact
          icon="analytics-outline"
          title="Sem registros no período"
          message="Adicione medições para acompanhar sua evolução."
          actionLabel="Nova medição"
          onAction={() => router.push('/metrics/new')}
        />
      ) : (
        <>
          <Card>
            <LineChart
              data={data}
              unit={unit}
              decimals={key === 'bmi' ? 2 : 1}
              accessibilityLabel={`Evolução de ${BODY_OPTIONS.find((o) => o.key === key)?.label}`}
            />
          </Card>
          {data.length > 1 ? (
            <Card tone="primary">
              <Text variant="bodySm">
                Variação no período:{' '}
                <Text variant="label">
                  {data[data.length - 1].y - data[0].y >= 0 ? '+' : ''}
                  {formatNumber(data[data.length - 1].y - data[0].y, key === 'bmi' ? 2 : 1)} {unit}
                </Text>{' '}
                ({data.length} registros)
              </Text>
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
