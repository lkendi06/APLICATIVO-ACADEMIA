import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import {
  Button,
  Chip,
  ErrorView,
  ListSkeleton,
  Screen,
  SectionHeader,
  Stepper,
  Text,
  TextField,
} from '@/components/ui';
import { DIFFICULTY_LABEL } from '@/constants/muscles';
import { FITNESS_GOAL_LABEL, SEX_LABEL } from '@/constants/profile';
import { useFeedback } from '@/contexts/FeedbackContext';
import { useProfile, useUpdateProfile } from '@/hooks/queries';
import { brDateToIso, isoToBrDate, profileSchema, type ProfileFormValues } from '@/schemas/forms';
import { spacing } from '@/theme/tokens';
import { ageFromBirthDate } from '@/utils/bmi';
import { friendlyError } from '@/utils/errors';
import { maskBrDate } from '@/utils/format';

export default function EditProfile() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const { toast } = useFeedback();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profile.data
      ? {
          fullName: profile.data.full_name,
          birthDate: isoToBrDate(profile.data.birth_date),
          sex: profile.data.sex,
          fitnessGoal: profile.data.fitness_goal,
          experienceLevel: profile.data.experience_level,
          weeklyGoal: profile.data.weekly_workout_goal,
        }
      : undefined,
  });

  const birth = watch('birthDate');
  const age =
    birth && /^\d{2}\/\d{2}\/\d{4}$/.test(birth) ? ageFromBirthDate(brDateToIso(birth)) : null;

  const onSubmit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        full_name: v.fullName.trim(),
        birth_date: v.birthDate ? brDateToIso(v.birthDate) : null,
        sex: v.sex,
        fitness_goal: v.fitnessGoal,
        experience_level: v.experienceLevel,
        weekly_workout_goal: v.weeklyGoal,
      });
      toast('Perfil atualizado!');
      router.back();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  });

  if (profile.isLoading) {
    return (
      <Screen title="Editar perfil" back>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  if (profile.error || !profile.data) {
    return (
      <Screen title="Editar perfil" back>
        <ErrorView error={profile.error} onRetry={profile.refetch} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Editar perfil"
      back
      footer={
        <Button
          title="Salvar alterações"
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={!isDirty}
          fullWidth
          testID="profile-save"
        />
      }>
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label="Nome"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="words"
            autoComplete="name"
            error={errors.fullName?.message}
            testID="profile-name"
          />
        )}
      />
      <Controller
        control={control}
        name="birthDate"
        render={({ field }) => (
          <TextField
            label="Data de nascimento (opcional)"
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            value={field.value ?? ''}
            onChangeText={(t) => field.onChange(maskBrDate(t))}
            onBlur={field.onBlur}
            error={errors.birthDate?.message}
            hint={
              age != null
                ? `${age} anos. Usada para saber se a classificação adulta do IMC se aplica.`
                : 'Usada para saber se a classificação adulta do IMC se aplica.'
            }
          />
        )}
      />

      <ChoiceGroup control={control} name="sex" title="Sexo (opcional)" labels={SEX_LABEL} />
      <Text variant="caption" color="textSubtle">
        Usado apenas para ajustar a silhueta ilustrativa do simulador. Não afeta o cálculo do IMC.
      </Text>
      <ChoiceGroup
        control={control}
        name="fitnessGoal"
        title="Objetivo principal"
        labels={FITNESS_GOAL_LABEL}
      />
      <ChoiceGroup
        control={control}
        name="experienceLevel"
        title="Nível de experiência"
        labels={DIFFICULTY_LABEL}
      />

      <SectionHeader title="Meta semanal" />
      <Controller
        control={control}
        name="weeklyGoal"
        render={({ field }) => (
          <Stepper
            label="Treinos por semana"
            value={field.value}
            onChange={field.onChange}
            min={1}
            max={14}
            suffix="x"
          />
        )}
      />
      {errors.weeklyGoal ? (
        <Text variant="caption" color="danger">
          Escolha entre 1 e 14 treinos por semana.
        </Text>
      ) : null}
    </Screen>
  );
}

function ChoiceGroup<K extends 'sex' | 'fitnessGoal' | 'experienceLevel'>({
  control,
  name,
  title,
  labels,
}: {
  control: ReturnType<typeof useForm<ProfileFormValues>>['control'];
  name: K;
  title: string;
  labels: Record<string, string>;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title={title} />
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {Object.entries(labels).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={field.value === key}
                onPress={() => field.onChange(field.value === key ? null : key)}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
}
