import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BodyAvatar, OUTFIT_COLORS, SKIN_TONES } from '@/components/body/BodyAvatar';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  Icon,
  LoadingView,
  Screen,
  SectionHeader,
  Segmented,
  Text,
} from '@/components/ui';
import { useMetrics, usePreferences, useProfile, useUpdatePreferences } from '@/hooks/queries';
import { useSyncedState } from '@/hooks/useSyncedState';
import { useBodyStats } from '@/hooks/useBodyStats';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import type { AvatarStyle } from '@/types/database';
import { BMI_CATEGORIES, classifyBmi } from '@/utils/bmi';
import { formatDate, formatFixed, formatNumber } from '@/utils/format';

type Mode = 'mine' | 'compare' | 'ranges';

export default function BodySimulator() {
  const { colors } = useTheme();
  const metrics = useMetrics();
  const profile = useProfile();
  const prefs = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const stats = useBodyStats(metrics.data, profile.data?.birth_date);
  const [mode, setMode] = useState<Mode>('mine');
  const savedStyle = prefs.data?.avatar_style;
  const [style, setStyle] = useSyncedState<AvatarStyle>(
    { base: 'neutral', skin: SKIN_TONES[1], outfit: OUTFIT_COLORS[0], ...savedStyle },
    (a, b) => JSON.stringify(a) === JSON.stringify(b),
  );
  const [rangeKey, setRangeKey] = useState(BMI_CATEGORIES[1].key);

  const series = stats.series;
  const [aIdx, setAIdx] = useState<number | null>(null);
  const [bIdx, setBIdx] = useState<number | null>(null);
  const a = series[aIdx ?? 0];
  const b = series[bIdx ?? series.length - 1];

  // Medidas de cintura/quadril mais próximas da data (somente se informadas).
  const shapeFor = useMemo(
    () => (date: Date | undefined, bmi: number | null) => {
      const list = (metrics.data ?? []).filter((m) => !date || new Date(m.measured_at) <= date);
      const waist = list.find((m) => m.waist_cm != null)?.waist_cm ?? null;
      const hip = list.find((m) => m.hip_cm != null)?.hip_cm ?? null;
      return { bmi, waistCm: waist, hipCm: hip };
    },
    [metrics.data],
  );

  const changeStyle = (patch: AvatarStyle) => {
    const next = { ...style, ...patch };
    setStyle(next);
    updatePrefs.mutate({ avatar_style: next });
  };

  if (metrics.isLoading) return <LoadingView />;

  const rangeCat = BMI_CATEGORIES.find((c) => c.key === rangeKey)!;
  const rangeBmi =
    rangeCat.max === Infinity ? 42 : rangeCat.min === 0 ? 17 : (rangeCat.min + rangeCat.max) / 2;

  return (
    <Screen back title="Simulador corporal">
      <Card tone="alt" style={{ flexDirection: 'row', gap: spacing.md }}>
        <Icon name="information-circle-outline" size={20} color="info" />
        <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
          Representação <Text variant="caption">ilustrativa</Text>, não uma previsão do seu corpo
          real. O IMC não revela percentual de gordura, massa muscular ou distribuição de gordura.
          Nada aqui é diagnóstico.
        </Text>
      </Card>

      <Segmented
        options={[
          { key: 'mine', label: 'Atual' },
          { key: 'compare', label: 'Comparar' },
          { key: 'ranges', label: 'Faixas' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode !== 'ranges' && series.length === 0 ? (
        <EmptyState
          icon="body-outline"
          title="Informe peso e altura"
          message="O avatar usa somente os dados que você cadastrou."
          actionLabel="Adicionar medição"
          onAction={() => router.push('/metrics/new')}
        />
      ) : null}

      {mode === 'mine' && stats.bmi != null ? (
        <Animated.View entering={FadeIn} key="mine">
          <Card style={{ alignItems: 'center', gap: spacing.md }}>
            <BodyAvatar
              input={shapeFor(undefined, stats.bmi)}
              style={style}
              size={150}
              accessibilityLabel={`Avatar ilustrativo com IMC ${formatFixed(stats.bmi, 1)}`}
            />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="h2" tabular>
                IMC {formatFixed(stats.bmi, 2)}
              </Text>
              {stats.category ? (
                <Badge label={stats.category.label} tone={stats.category.tone} />
              ) : null}
              <Text variant="caption" color="textMuted">
                {formatNumber(stats.weight, 1)} kg · {formatNumber(stats.height, 0)} cm
                {stats.lastUpdate ? ` · ${formatDate(stats.lastUpdate)}` : ''}
              </Text>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {mode === 'compare' && series.length > 0 ? (
        <Animated.View entering={FadeIn} key="compare" style={{ gap: spacing.md }}>
          {series.length < 2 ? (
            <Text variant="bodySm" color="textMuted">
              Registre pelo menos duas medições de peso em datas diferentes para comparar.
            </Text>
          ) : null}
          <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[a, b].map((p, i) =>
              p ? (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <Text variant="overline" color="textMuted">
                    {i === 0 ? 'Antes' : 'Depois'}
                  </Text>
                  <BodyAvatar
                    input={shapeFor(p.date, p.bmi)}
                    style={style}
                    size={110}
                    accessibilityLabel={`Avatar ilustrativo em ${formatDate(p.date)}`}
                  />
                  <Text variant="label">{formatDate(p.date)}</Text>
                  <Text variant="caption" color="textMuted" tabular>
                    {formatNumber(p.metric.weight_kg, 1)} kg · IMC {formatFixed(p.bmi, 1)}
                  </Text>
                </View>
              ) : null,
            )}
          </Card>
          {a && b && a !== b ? (
            <Text variant="bodySm" align="center">
              Diferença: {formatNumber((b.metric.weight_kg ?? 0) - (a.metric.weight_kg ?? 0), 1)} kg
              · IMC {formatFixed(b.bmi - a.bmi, 2)}
            </Text>
          ) : null}
          <DatePickerRow label="Antes" series={series} value={aIdx ?? 0} onChange={setAIdx} />
          <DatePickerRow
            label="Depois"
            series={series}
            value={bIdx ?? series.length - 1}
            onChange={setBIdx}
          />
        </Animated.View>
      ) : null}

      {mode === 'ranges' ? (
        <Animated.View entering={FadeIn} key="ranges" style={{ gap: spacing.md }}>
          <Text variant="bodySm" color="textMuted">
            Veja um exemplo ilustrativo de silhueta em cada faixa de IMC para adultos. Pessoas com o
            mesmo IMC podem ter corpos muito diferentes.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}>
            {BMI_CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                selected={rangeKey === c.key}
                onPress={() => setRangeKey(c.key)}
              />
            ))}
          </ScrollView>
          <Card style={{ alignItems: 'center', gap: spacing.sm }}>
            <BodyAvatar
              input={{ bmi: rangeBmi }}
              style={style}
              size={140}
              accessibilityLabel={`Exemplo ilustrativo da faixa ${rangeCat.label}`}
            />
            <Text variant="h3">{rangeCat.label}</Text>
            <Text variant="caption" color="textMuted">
              {rangeCat.min === 0
                ? `IMC abaixo de ${formatFixed(rangeCat.max, 1)}`
                : rangeCat.max === Infinity
                  ? `IMC ${formatFixed(rangeCat.min, 1)} ou mais`
                  : `IMC de ${formatFixed(rangeCat.min, 1)} a ${formatFixed(rangeCat.max - 0.1, 1)}`}
            </Text>
            {stats.bmi != null && classifyBmi(stats.bmi).key === rangeCat.key && stats.adult ? (
              <Badge label="Sua faixa atual" tone="primary" />
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      <SectionHeader title="Personalizar avatar" />
      <Card style={{ gap: spacing.lg }}>
        <Segmented
          options={[
            { key: 'feminine', label: 'Feminino' },
            { key: 'neutral', label: 'Neutro' },
            { key: 'masculine', label: 'Masculino' },
          ]}
          value={style.base ?? 'neutral'}
          onChange={(v) => changeStyle({ base: v as AvatarStyle['base'] })}
        />
        <Swatches
          label="Tom de pele"
          colors={SKIN_TONES}
          value={style.skin}
          onChange={(skin) => changeStyle({ skin })}
          ring={colors.text}
        />
        <Swatches
          label="Cor da roupa"
          colors={OUTFIT_COLORS}
          value={style.outfit}
          onChange={(outfit) => changeStyle({ outfit })}
          ring={colors.text}
        />
      </Card>
    </Screen>
  );
}

function DatePickerRow({
  label,
  series,
  value,
  onChange,
}: {
  label: string;
  series: { date: Date }[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}>
        {series.map((p, i) => (
          <Chip
            key={i}
            label={formatDate(p.date, { day: '2-digit', month: 'short', year: '2-digit' })}
            selected={i === value}
            onPress={() => onChange(i)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Swatches({
  label,
  colors,
  value,
  onChange,
  ring,
}: {
  label: string;
  colors: string[];
  value?: string;
  onChange: (c: string) => void;
  ring: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        {colors.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === c }}
            accessibilityLabel={`${label} ${c}`}
            onPress={() => onChange(c)}
            style={[
              styles.swatch,
              { backgroundColor: c, borderColor: value === c ? ring : 'transparent' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swatch: { width: 34, height: 34, borderRadius: radii.pill, borderWidth: 3 },
});
