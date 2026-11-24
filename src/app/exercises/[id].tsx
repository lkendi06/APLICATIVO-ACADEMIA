import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { LineChart } from '@/components/charts/LineChart';
import { ExerciseMedia } from '@/components/exercise/ExerciseMedia';
import {
  Badge,
  Card,
  Chip,
  ErrorView,
  IconButton,
  LoadingView,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { DIFFICULTY_LABEL, MUSCLE_LABEL } from '@/constants/muscles';
import { useExercise, useExerciseProgress, useFavorites, useToggleFavorite } from '@/hooks/queries';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import { formatDate, formatNumber } from '@/utils/format';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const exercise = useExercise(id);
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const progress = useExerciseProgress(id);
  const isFav = (favorites.data ?? []).includes(id);

  if (exercise.isLoading) return <LoadingView />;
  if (exercise.error || !exercise.data)
    return <ErrorView error={exercise.error} onRetry={exercise.refetch} />;
  const e = exercise.data;
  const history = progress.data ?? [];
  const best = history.reduce((a, p) => Math.max(a, p.max_weight_kg), 0);

  return (
    <Screen
      back
      title={e.name}
      right={
        <IconButton
          icon={isFav ? 'heart' : 'heart-outline'}
          label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onPress={() => toggle.mutate({ id, favorite: !isFav })}
          testID="exercise-favorite"
        />
      }>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{
          borderRadius: radii.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <ExerciseMedia mediaKey={e.media_key} mediaUrl={e.media_url} name={e.name} rounded={0} />
      </Animated.View>
      <Text variant="caption" color="textSubtle" align="center">
        Demonstração ilustrativa em loop · em destaque, o músculo principal
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text variant="h1">{e.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Badge label={MUSCLE_LABEL[e.primary_muscle]} tone="primary" />
          <Badge label={DIFFICULTY_LABEL[e.difficulty]} tone="accent" />
          <Badge label={e.equipment} />
        </View>
        <Text color="textMuted">{e.description}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <Text variant="caption" color="textMuted">
            Séries sugeridas
          </Text>
          <Text variant="h2">{e.recommended_sets ?? '—'}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="caption" color="textMuted">
            {e.is_timed ? 'Tempo sugerido' : 'Repetições'}
          </Text>
          <Text variant="h2">{e.recommended_reps ?? '—'}</Text>
        </Card>
      </View>

      {e.secondary_muscles.length ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Músculos secundários" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {e.secondary_muscles.map((m) => (
              <Chip key={m} label={MUSCLE_LABEL[m]} />
            ))}
          </View>
        </View>
      ) : null}

      <SectionHeader title="Como executar" />
      <Card style={{ gap: spacing.md }}>
        {e.instructions.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spacing.md }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text variant="caption" color="primaryText">
                {i + 1}
              </Text>
            </View>
            <Text style={{ flex: 1 }}>{step}</Text>
          </View>
        ))}
      </Card>

      {e.tips.length ? (
        <>
          <SectionHeader title="Dicas" />
          <Card tone="accent" style={{ gap: spacing.sm }}>
            {e.tips.map((t, i) => (
              <Text key={i} variant="bodySm">
                💡 {t}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader
        title="Seu histórico"
        action={history.length ? 'Ver evolução' : undefined}
        onAction={() =>
          router.push({ pathname: '/history', params: { tab: 'exercises', exerciseId: id } })
        }
      />
      {history.length ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="bodySm" color="textMuted">
            Melhor carga: <Text variant="label">{formatNumber(best, 1)} kg</Text> · {history.length}{' '}
            sessão(ões) · última em {formatDate(history[history.length - 1].started_at)}
          </Text>
          <LineChart
            data={history.map((p) => ({ x: new Date(p.started_at), y: p.max_weight_kg }))}
            unit="kg"
            accessibilityLabel={`Evolução da carga máxima em ${e.name}`}
            height={160}
          />
        </Card>
      ) : (
        <Card tone="alt">
          <Text variant="bodySm" color="textMuted">
            Você ainda não registrou este exercício. Ao concluir séries, sua evolução de carga
            aparece aqui.
          </Text>
        </Card>
      )}
      <Text variant="caption" color="textSubtle">
        Execute os movimentos dentro dos seus limites. Em caso de dor ou dúvida, procure um
        profissional de educação física.
      </Text>
    </Screen>
  );
}
