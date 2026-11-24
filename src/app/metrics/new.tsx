import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button, Card, Screen, SectionHeader, Text, TextField } from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { useMetrics, useSaveMetric, useUnits } from '@/hooks/queries';
import { latestValues } from '@/hooks/useBodyStats';
import { metricSchema, type MetricFormValues } from '@/schemas/forms';
import { spacing } from '@/theme/tokens';
import { calculateBmi, classifyBmi } from '@/utils/bmi';
import { friendlyError } from '@/utils/errors';
import {
  formatFixed,
  formatNumber,
  fromCm,
  fromKg,
  parseDecimal,
  toCm,
  toKg,
} from '@/utils/format';

const pad = (n: number) => String(n).padStart(2, '0');
const toBr = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const toHm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseDateTime(date: string, time: string): Date | null {
  const dm = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dm || !tm) return null;
  const d = new Date(+dm[3], +dm[2] - 1, +dm[1], +tm[1], +tm[2]);
  if (d.getDate() !== +dm[1] || d.getMonth() !== +dm[2] - 1 || +tm[1] > 23 || +tm[2] > 59)
    return null;
  if (d.getTime() > Date.now() + 60_000) return null;
  return d;
}

export default function NewMetric() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const units = useUnits();
  const metrics = useMetrics();
  const save = useSaveMetric();
  const { toast } = useFeedback();
  const editing = id ? metrics.data?.find((m) => m.id === id) : undefined;
  const latest = useMemo(() => latestValues(metrics.data ?? []), [metrics.data]);
  const initialDate = editing ? new Date(editing.measured_at) : new Date();
  const [date, setDate] = useState(toBr(initialDate));
  const [time, setTime] = useState(toHm(initialDate));
  const [dateError, setDateError] = useState<string | null>(null);

  const w = (v: number | null | undefined) =>
    v == null ? '' : formatNumber(fromKg(v, units.weight), 2);
  const l = (v: number | null | undefined) =>
    v == null ? '' : formatNumber(fromCm(v, units.length), 1);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    values: editing
      ? {
          weight: w(editing.weight_kg),
          height: l(editing.height_cm),
          waist: l(editing.waist_cm),
          arm: l(editing.arm_cm),
          chest: l(editing.chest_cm),
          hip: l(editing.hip_cm),
          thigh: l(editing.thigh_cm),
          bodyFat: editing.body_fat_pct == null ? '' : formatNumber(editing.body_fat_pct, 1),
          notes: editing.notes ?? '',
        }
      : {
          weight: '',
          // A altura raramente muda: sugerimos a última informada.
          height: l(latest.height?.height_cm),
          waist: '',
          arm: '',
          chest: '',
          hip: '',
          thigh: '',
          bodyFat: '',
          notes: '',
        },
  });

  const weightNum = parseDecimal(watch('weight') ?? '');
  const heightNum = parseDecimal(watch('height') ?? '');
  const previewBmi =
    weightNum && heightNum
      ? calculateBmi(toKg(weightNum, units.weight), toCm(heightNum, units.length))
      : null;

  const onSubmit = handleSubmit(async (v) => {
    const when = parseDateTime(date, time);
    if (!when) {
      setDateError('Data ou hora inválida (não pode ser no futuro).');
      return;
    }
    setDateError(null);
    const num = (s?: string) => (s && s.trim() ? parseDecimal(s) : null);
    const len = (s?: string) => {
      const n = num(s);
      return n == null ? null : toCm(n, units.length);
    };
    const wt = num(v.weight);
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: {
          measured_at: when.toISOString(),
          weight_kg: wt == null ? null : toKg(wt, units.weight),
          height_cm: len(v.height),
          waist_cm: len(v.waist),
          arm_cm: len(v.arm),
          chest_cm: len(v.chest),
          hip_cm: len(v.hip),
          thigh_cm: len(v.thigh),
          body_fat_pct: num(v.bodyFat),
          notes: v.notes?.trim() || null,
        },
      });
      toast(editing ? 'Medição atualizada.' : 'Medição salva!');
      router.back();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  });

  const field = (
    name: keyof MetricFormValues,
    label: string,
    suffix: string,
    placeholder: string,
    testID?: string,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <View style={{ flex: 1 }}>
          <TextField
            testID={testID}
            label={label}
            suffix={suffix}
            placeholder={placeholder}
            keyboardType="decimal-pad"
            value={f.value ?? ''}
            onChangeText={f.onChange}
            onBlur={f.onBlur}
            error={errors[name]?.message}
          />
        </View>
      )}
    />
  );

  return (
    <Screen
      back
      title={editing ? 'Editar medição' : 'Nova medição'}
      footer={
        <Button
          title="Salvar medição"
          size="lg"
          loading={save.isPending}
          onPress={onSubmit}
          testID="metric-save"
        />
      }>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1.4 }}>
          <TextField
            label="Data"
            value={date}
            onChangeText={setDate}
            placeholder="DD/MM/AAAA"
            keyboardType="numbers-and-punctuation"
            error={dateError ?? undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Hora"
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <SectionHeader title="Principais" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {field(
          'weight',
          'Peso',
          units.weight,
          units.weight === 'kg' ? '80,5' : '177',
          'metric-weight',
        )}
        {field(
          'height',
          'Altura',
          units.length,
          units.length === 'cm' ? '180' : '71',
          'metric-height',
        )}
      </View>
      {previewBmi != null ? (
        <Card tone="primary">
          <Text variant="bodySm">
            IMC calculado: <Text variant="label">{formatFixed(previewBmi, 2)}</Text> ·{' '}
            {classifyBmi(previewBmi).label}{' '}
            <Text variant="caption" color="textMuted">
              (referência para adultos)
            </Text>
          </Text>
        </Card>
      ) : null}

      <SectionHeader title="Medidas (opcionais)" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {field('waist', 'Abdômen', units.length, '—')}
        {field('chest', 'Peito', units.length, '—')}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {field('arm', 'Braço', units.length, '—')}
        {field('hip', 'Quadril', units.length, '—')}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {field('thigh', 'Coxa', units.length, '—')}
        {field('bodyFat', 'Gordura corporal', '%', 'Se souber')}
      </View>
      <Controller
        control={control}
        name="notes"
        render={({ field: f }) => (
          <TextField
            label="Observações (opcional)"
            value={f.value ?? ''}
            onChangeText={f.onChange}
            multiline
            maxLength={500}
            error={errors.notes?.message}
          />
        )}
      />
      <Text variant="caption" color="textSubtle">
        Preencha só o que você mediu. Nada é estimado ou inventado pelo app.
      </Text>
    </Screen>
  );
}
