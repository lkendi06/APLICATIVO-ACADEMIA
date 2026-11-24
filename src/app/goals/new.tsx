import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ListRow,
  ListSkeleton,
  Screen,
  SectionHeader,
  Text,
  TextField,
} from '@/components/ui';
import { GOAL_TYPE_LABEL } from '@/constants/profile';
import { useFeedback } from '@/contexts/FeedbackContext';
import {
  useExerciseProgress,
  useExercises,
  useGoals,
  useMetrics,
  useSaveGoal,
  useUnits,
} from '@/hooks/queries';
import { latestValues } from '@/hooks/useBodyStats';
import { brDateToIso, isoToBrDate } from '@/schemas/forms';
import { exercisePicker } from '@/services/exercisePicker';
import { spacing } from '@/theme/tokens';
import type { GoalType, UserGoal } from '@/types/database';
import { friendlyError } from '@/utils/errors';
import { formatNumber, fromKg, maskBrDate, parseDecimal, toKg } from '@/utils/format';

const TYPES: GoalType[] = [
  'target_weight',
  'weekly_workouts',
  'body_fat',
  'exercise_load',
  'custom',
];

const RANGE: Record<Exclude<GoalType, 'custom'>, [number, number]> = {
  target_weight: [20, 400],
  weekly_workouts: [1, 14],
  body_fat: [2, 75],
  exercise_load: [0.5, 1000],
};

export default function NewGoal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goals = useGoals();
  const editing = id ? goals.data?.find((g) => g.id === id) : undefined;
  if (id && goals.isLoading) {
    return (
      <Screen title="Editar objetivo" back>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  return <GoalForm key={editing?.id ?? 'new'} editing={editing} />;
}

function GoalForm({ editing }: { editing: UserGoal | undefined }) {
  const units = useUnits();
  const metrics = useMetrics();
  const exercises = useExercises();
  const save = useSaveGoal();
  const { toast } = useFeedback();

  const isWeightGoal = editing?.type === 'target_weight' || editing?.type === 'exercise_load';
  const [type, setType] = useState<GoalType>(editing?.type ?? 'target_weight');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [titleTouched, setTitleTouched] = useState(!!editing);
  const [target, setTarget] = useState(() =>
    editing?.target_value == null
      ? ''
      : formatNumber(
          isWeightGoal ? fromKg(editing.target_value, units.weight) : editing.target_value,
          isWeightGoal ? 1 : 0,
        ),
  );
  const [customUnit, setCustomUnit] = useState(editing?.unit ?? '');
  const [deadline, setDeadline] = useState(isoToBrDate(editing?.deadline));
  const [exerciseId, setExerciseId] = useState<string | null>(editing?.exercise_id ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const progress = useExerciseProgress(
    type === 'exercise_load' ? (exerciseId ?? undefined) : undefined,
  );

  const latest = useMemo(() => latestValues(metrics.data ?? []), [metrics.data]);
  const exerciseName = exerciseId ? exercises.data?.find((e) => e.id === exerciseId)?.name : null;
  const currentLoad = (progress.data ?? []).length
    ? Math.max(...progress.data!.map((r) => r.max_weight_kg))
    : null;

  const unitLabel =
    type === 'target_weight' || type === 'exercise_load'
      ? units.weight
      : type === 'body_fat'
        ? '%'
        : type === 'weekly_workouts'
          ? 'treinos'
          : customUnit;

  const suggestedTitle = useMemo(() => {
    const t = target.trim();
    switch (type) {
      case 'target_weight':
        return t ? `Chegar a ${t} ${units.weight}` : 'Peso-alvo';
      case 'weekly_workouts':
        return t ? `Treinar ${t}x por semana` : 'Treinos por semana';
      case 'body_fat':
        return t ? `Chegar a ${t}% de gordura` : 'Gordura corporal';
      case 'exercise_load':
        return exerciseName
          ? `${exerciseName}: ${t || '?'} ${units.weight}`
          : 'Carga em um exercício';
      default:
        return '';
    }
  }, [type, target, units.weight, exerciseName]);

  const effectiveTitle = titleTouched ? title : suggestedTitle;

  function pickExercise() {
    exercisePicker.open((sel) => sel[0] && setExerciseId(sel[0].id), { multiple: false });
    router.push('/exercises?pick=1');
  }

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!effectiveTitle.trim()) errs.title = 'Dê um nome ao objetivo.';
    if (effectiveTitle.trim().length > 120) errs.title = 'Máximo de 120 caracteres.';
    const t = target.trim() ? parseDecimal(target) : null;
    if (type !== 'custom') {
      const [min, max] = RANGE[type];
      const inKg =
        t != null && (type === 'target_weight' || type === 'exercise_load')
          ? toKg(t, units.weight)
          : t;
      if (inKg == null || inKg < min || inKg > max)
        errs.target = `Informe um valor válido para a meta.`;
      if (type === 'weekly_workouts' && t != null && !Number.isInteger(t))
        errs.target = 'Use um número inteiro.';
    }
    if (type === 'exercise_load' && !exerciseId) errs.exercise = 'Escolha o exercício.';
    let deadlineIso: string | null = null;
    if (deadline.trim()) {
      const ok = /^\d{2}\/\d{2}\/\d{4}$/.test(deadline);
      deadlineIso = ok ? brDateToIso(deadline) : null;
      const d = deadlineIso ? new Date(`${deadlineIso}T12:00:00`) : null;
      if (!d || Number.isNaN(d.getTime()) || isoToBrDate(deadlineIso) !== deadline)
        errs.deadline = 'Data inválida (DD/MM/AAAA).';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const targetValue =
      t == null
        ? null
        : type === 'target_weight' || type === 'exercise_load'
          ? toKg(t, units.weight)
          : t;
    // Ponto de partida = dado real mais recente no momento da criação.
    const startValue = editing
      ? editing.start_value
      : type === 'target_weight'
        ? (latest.weight?.weight_kg ?? null)
        : type === 'body_fat'
          ? (latest.bodyFat?.body_fat_pct ?? null)
          : type === 'exercise_load'
            ? currentLoad
            : null;

    try {
      await save.mutateAsync({
        id: editing?.id,
        input: {
          type,
          title: effectiveTitle.trim(),
          target_value: targetValue,
          start_value: startValue,
          unit: type === 'custom' ? customUnit.trim() || null : unitLabel,
          exercise_id: type === 'exercise_load' ? exerciseId : null,
          deadline: deadlineIso,
        },
      });
      toast(editing ? 'Objetivo atualizado.' : 'Objetivo criado!');
      router.back();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  }

  const startHint =
    type === 'target_weight'
      ? latest.weight
        ? `Seu peso mais recente: ${formatNumber(fromKg(latest.weight.weight_kg!, units.weight), 1)} ${units.weight}`
        : 'Registre seu peso em Métricas para acompanhar o progresso.'
      : type === 'body_fat'
        ? latest.bodyFat
          ? `Último registro: ${formatNumber(latest.bodyFat.body_fat_pct, 1)}%`
          : 'Registre o percentual de gordura em Métricas para acompanhar.'
        : type === 'exercise_load' && exerciseId
          ? currentLoad != null
            ? `Sua maior carga registrada: ${formatNumber(fromKg(currentLoad, units.weight), 1)} ${units.weight}`
            : 'Você ainda não registrou séries deste exercício.'
          : undefined;

  return (
    <Screen
      title={editing ? 'Editar objetivo' : 'Novo objetivo'}
      back
      footer={
        <Button
          title={editing ? 'Salvar' : 'Criar objetivo'}
          onPress={onSave}
          loading={save.isPending}
          fullWidth
          testID="goal-save"
        />
      }>
      <SectionHeader title="Tipo" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {TYPES.map((t) => (
          <Chip
            key={t}
            label={GOAL_TYPE_LABEL[t]}
            selected={type === t}
            onPress={() => !editing && setType(t)}
          />
        ))}
      </View>
      {editing ? (
        <Text variant="caption" color="textSubtle">
          O tipo não pode ser alterado depois de criado.
        </Text>
      ) : null}

      {type === 'exercise_load' ? (
        <Card padded={false}>
          <ListRow
            icon="barbell-outline"
            title={exerciseName ?? 'Escolher exercício'}
            subtitle={errors.exercise}
            onPress={pickExercise}
          />
        </Card>
      ) : null}

      {type === 'custom' ? (
        <TextField
          label="Unidade (opcional)"
          placeholder="ex.: km, minutos"
          value={customUnit}
          onChangeText={setCustomUnit}
          maxLength={20}
        />
      ) : null}

      <TextField
        label={type === 'custom' ? 'Meta numérica (opcional)' : 'Meta'}
        keyboardType="decimal-pad"
        value={target}
        onChangeText={setTarget}
        suffix={unitLabel || undefined}
        error={errors.target}
        hint={startHint}
        testID="goal-target"
      />
      <TextField
        label="Nome do objetivo"
        value={effectiveTitle}
        onChangeText={(v) => {
          setTitleTouched(true);
          setTitle(v);
        }}
        error={errors.title}
        maxLength={120}
        testID="goal-title"
      />
      <TextField
        label="Prazo (opcional)"
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        value={deadline}
        onChangeText={(v) => setDeadline(maskBrDate(v))}
        error={errors.deadline}
      />
      <Text variant="caption" color="textSubtle">
        O progresso é calculado automaticamente com suas medições, sessões e cargas registradas.
      </Text>
    </Screen>
  );
}
