import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { ExerciseMedia } from '@/components/exercise/ExerciseMedia';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Screen,
  SectionHeader,
  Stepper,
  Text,
  TextField,
} from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { MUSCLE_LABEL, PLAN_COLORS } from '@/constants/muscles';
import { useExercises, usePreferences, useSavePlan } from '@/hooks/queries';
import { planSchema, type PlanFormValues } from '@/schemas/forms';
import type { PlanWithItems } from '@/services/api';
import { exercisePicker } from '@/services/exercisePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import type { MuscleGroup } from '@/types/database';
import { friendlyError } from '@/utils/errors';

type Props = { plan?: PlanWithItems };

export function PlanEditor({ plan }: Props) {
  const { colors } = useTheme();
  const { toast, confirm } = useFeedback();
  const save = useSavePlan();
  const prefs = usePreferences();
  const exercises = useExercises();
  const defaultRest = prefs.data?.default_rest_seconds ?? 90;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan?.name ?? '',
      description: plan?.description ?? '',
      color: plan?.color ?? PLAN_COLORS[0],
      items:
        plan?.items.map((i) => ({
          id: i.id,
          exercise_id: i.exercise_id,
          name: i.exercise.name,
          primary_muscle: i.exercise.primary_muscle,
          target_sets: i.target_sets,
          target_reps: i.target_reps,
          target_weight_kg: i.target_weight_kg,
          rest_seconds: i.rest_seconds,
        })) ?? [],
    },
  });
  const { fields, append, remove, move, update } = useFieldArray({
    control,
    name: 'items',
    keyName: 'key',
  });
  const items = watch('items');
  const muscles = Array.from(new Set(items.map((i) => i.primary_muscle))) as MuscleGroup[];

  const addExercises = () => {
    exercisePicker.open((selected) => {
      selected.forEach((e) =>
        append({
          exercise_id: e.id,
          name: e.name,
          primary_muscle: e.primary_muscle,
          target_sets: e.recommended_sets ?? 3,
          target_reps: parseInt(e.recommended_reps ?? '10', 10) || 10,
          target_weight_kg: null,
          rest_seconds: defaultRest,
        }),
      );
    });
    router.push({ pathname: '/exercises', params: { pick: '1' } });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const id = await save.mutateAsync({
        id: plan?.id,
        input: {
          name: values.name,
          description: values.description,
          color: values.color,
          muscle_groups: muscles,
          items: values.items.map((i) => ({
            id: i.id,
            exercise_id: i.exercise_id,
            target_sets: i.target_sets,
            target_reps: i.target_reps,
            target_weight_kg: i.target_weight_kg,
            rest_seconds: i.rest_seconds,
          })),
        },
      });
      toast(plan ? 'Treino atualizado.' : 'Treino criado!');
      router.replace(`/workouts/${id}`);
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  });

  const onBack = async () => {
    if (isDirty || fields.length !== (plan?.items.length ?? 0)) {
      const ok = await confirm({
        title: 'Descartar alterações?',
        message: 'As alterações neste treino não foram salvas.',
        confirmLabel: 'Descartar',
        destructive: true,
      });
      if (!ok) return;
    }
    router.back();
  };

  const mediaFor = (exerciseId: string) => exercises.data?.find((e) => e.id === exerciseId);

  return (
    <Screen
      title={plan ? 'Editar treino' : 'Novo treino'}
      right={<IconButton icon="close" label="Fechar" onPress={onBack} />}
      footer={
        <Button
          title={plan ? 'Salvar alterações' : 'Salvar treino'}
          size="lg"
          loading={save.isPending}
          onPress={onSubmit}
          testID="plan-save"
        />
      }>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            testID="plan-name"
            label="Nome do treino"
            placeholder="Ex.: Treino A — Peito e tríceps"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            maxLength={80}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Observações (opcional)"
            placeholder="Ex.: foco em cadência lenta"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            multiline
            maxLength={500}
            error={errors.description?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" color="textMuted">
              Cor
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {PLAN_COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: field.value === c }}
                  accessibilityLabel={`Cor ${c}`}
                  onPress={() => field.onChange(c)}
                  style={[
                    styles.color,
                    {
                      backgroundColor: c,
                      borderColor: field.value === c ? colors.text : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      />

      {muscles.length ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" color="textMuted">
            Grupos musculares trabalhados
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {muscles.map((m) => (
              <Chip key={m} label={MUSCLE_LABEL[m]} />
            ))}
          </View>
        </View>
      ) : null}

      <SectionHeader title={`Exercícios (${fields.length})`} />
      {errors.items?.message || errors.items?.root?.message ? (
        <Text variant="caption" color="danger">
          {errors.items?.message ?? errors.items?.root?.message}
        </Text>
      ) : null}
      {fields.length === 0 ? (
        <EmptyState
          compact
          icon="add-circle-outline"
          title="Adicione exercícios"
          message="Escolha na biblioteca os exercícios deste treino."
        />
      ) : null}

      {fields.map((f, index) => {
        const item = items[index];
        if (!item) return null;
        const ex = mediaFor(item.exercise_id);
        return (
          <Animated.View key={f.key} layout={LinearTransition} entering={FadeIn}>
            <Card style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <ExerciseMedia
                  mediaKey={ex?.media_key}
                  mediaUrl={ex?.media_url}
                  name={item.name}
                  animated={false}
                  size={48}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {index + 1}. {item.name}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {MUSCLE_LABEL[item.primary_muscle as MuscleGroup]}
                  </Text>
                </View>
                <IconButton
                  icon="chevron-up"
                  size={32}
                  label="Mover para cima"
                  disabled={index === 0}
                  onPress={() => move(index, index - 1)}
                />
                <IconButton
                  icon="chevron-down"
                  size={32}
                  label="Mover para baixo"
                  disabled={index === fields.length - 1}
                  onPress={() => move(index, index + 1)}
                />
                <IconButton
                  icon="trash-outline"
                  size={32}
                  tone="danger"
                  label={`Remover ${item.name}`}
                  onPress={() => remove(index)}
                />
              </View>
              <View style={styles.grid}>
                <Stepper
                  compact
                  label="Séries"
                  value={item.target_sets}
                  min={1}
                  max={20}
                  onChange={(v) => update(index, { ...item, target_sets: v })}
                />
                <Stepper
                  compact
                  label="Repetições"
                  value={item.target_reps}
                  min={1}
                  max={100}
                  onChange={(v) => update(index, { ...item, target_reps: v })}
                />
              </View>
              <View style={styles.grid}>
                <Stepper
                  compact
                  label="Carga inicial (kg)"
                  value={item.target_weight_kg ?? 0}
                  step={2.5}
                  decimals={1}
                  max={1000}
                  onChange={(v) => update(index, { ...item, target_weight_kg: v || null })}
                />
                <Stepper
                  compact
                  label="Descanso (s)"
                  value={item.rest_seconds}
                  step={15}
                  max={900}
                  onChange={(v) => update(index, { ...item, rest_seconds: v })}
                />
              </View>
            </Card>
          </Animated.View>
        );
      })}

      <Button
        title="Adicionar exercícios"
        icon="add"
        variant="outline"
        onPress={addExercises}
        testID="plan-add-exercise"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  color: { width: 34, height: 34, borderRadius: radii.pill, borderWidth: 3 },
  grid: { flexDirection: 'row', gap: spacing.md },
});
