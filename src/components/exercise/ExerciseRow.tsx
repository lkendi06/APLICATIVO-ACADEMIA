import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { DIFFICULTY_LABEL, MUSCLE_LABEL } from '@/constants/muscles';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import type { Exercise } from '@/types/database';

import { ExerciseMedia } from './ExerciseMedia';

type Props = {
  exercise: Pick<
    Exercise,
    'id' | 'name' | 'primary_muscle' | 'media_key' | 'media_url' | 'equipment'
  > &
    Partial<Pick<Exercise, 'difficulty'>>;
  onPress: () => void;
  favorite?: boolean;
  selected?: boolean;
  right?: React.ReactNode;
};

export function ExerciseRow({ exercise, onPress, favorite, selected, right }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${MUSCLE_LABEL[exercise.primary_muscle]}`}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primaryText : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <ExerciseMedia
        mediaKey={exercise.media_key}
        mediaUrl={exercise.media_url}
        name={exercise.name}
        animated={false}
        size={64}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {MUSCLE_LABEL[exercise.primary_muscle]} · {exercise.equipment}
        </Text>
        {exercise.difficulty ? <Badge label={DIFFICULTY_LABEL[exercise.difficulty]} /> : null}
      </View>
      {favorite ? <Icon name="heart" size={16} color="danger" /> : null}
      {right ??
        (selected ? (
          <Icon name="checkmark-circle" size={24} color="primaryText" />
        ) : (
          <Icon name="chevron-forward" size={18} color="textSubtle" />
        ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
