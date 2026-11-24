import * as Haptics from 'expo-haptics';
import { useSyncedState } from '@/hooks/useSyncedState';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii, spacing } from '@/theme/tokens';
import type { PreviousSet, WorkoutSet } from '@/types/database';
import { formatNumber, parseDecimal } from '@/utils/format';

type Props = {
  set: WorkoutSet;
  previous?: PreviousSet;
  timed?: boolean;
  onChange: (
    patch: Partial<Pick<WorkoutSet, 'reps' | 'weight_kg' | 'completed' | 'duration_seconds'>>,
  ) => void;
  onDelete: () => void;
  onCompleted: () => void;
};

export function SetRow({ set, previous, timed, onChange, onDelete, onCompleted }: Props) {
  const { colors } = useTheme();
  const [kg, setKg] = useSyncedState(formatNumber(set.weight_kg, 2));
  const repsValue = timed ? (set.duration_seconds ?? set.reps) : set.reps;
  const [reps, setReps] = useSyncedState(String(repsValue));

  const commitKg = () => {
    const n = parseDecimal(kg);
    if (n == null || n < 0 || n > 1000) return setKg(formatNumber(set.weight_kg, 2));
    if (n !== set.weight_kg) onChange({ weight_kg: Math.round(n * 100) / 100 });
  };
  const commitReps = () => {
    const n = parseDecimal(reps);
    const max = timed ? 36000 : 1000;
    if (n == null || n < 0 || n > max) return setReps(String(repsValue));
    const v = Math.round(n);
    if (timed) {
      if (v !== set.duration_seconds) onChange({ duration_seconds: v, reps: 1 });
    } else if (v !== set.reps) onChange({ reps: v });
  };

  const toggle = () => {
    const kgN = parseDecimal(kg) ?? set.weight_kg;
    const repsN = Math.round(parseDecimal(reps) ?? repsValue);
    const completing = !set.completed;
    onChange({
      completed: completing,
      weight_kg: Math.max(0, Math.min(1000, kgN)),
      ...(timed
        ? { duration_seconds: repsN, reps: 1 }
        : { reps: Math.max(0, Math.min(1000, repsN)) }),
    });
    if (completing) {
      if (Platform.OS !== 'web')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      onCompleted();
    }
  };

  const bg = useAnimatedStyle(() => ({
    backgroundColor: withTiming(set.completed ? colors.successSoft : 'transparent', {
      duration: 220,
    }),
  }));
  const check = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(set.completed ? 1 : 0.9) }],
  }));

  return (
    <Animated.View style={[styles.row, bg]} accessibilityLabel={`Série ${set.set_number}`}>
      <Text variant="label" color={set.completed ? 'success' : 'textMuted'} style={styles.num}>
        {set.set_number}
      </Text>
      <Text variant="caption" color="textSubtle" style={styles.prev} numberOfLines={1}>
        {previous ? `${formatNumber(previous.weight_kg, 1)}×${previous.reps}` : '—'}
      </Text>
      <TextInput
        accessibilityLabel={`Carga da série ${set.set_number} em quilos`}
        value={kg}
        onChangeText={setKg}
        onBlur={commitKg}
        keyboardType="decimal-pad"
        selectTextOnFocus
        style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
      />
      <TextInput
        accessibilityLabel={
          timed
            ? `Duração da série ${set.set_number} em segundos`
            : `Repetições da série ${set.set_number}`
        }
        value={reps}
        onChangeText={setReps}
        onBlur={commitReps}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
      />
      <Animated.View style={check}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: set.completed }}
          accessibilityLabel={
            set.completed ? `Série ${set.set_number} concluída` : `Concluir série ${set.set_number}`
          }
          onPress={toggle}
          hitSlop={6}
          style={[
            styles.check,
            { backgroundColor: set.completed ? colors.success : colors.surfaceAlt },
          ]}>
          <Icon name="checkmark" size={20} color={set.completed ? '#0B0D10' : colors.textSubtle} />
        </Pressable>
      </Animated.View>
      <IconButton
        icon="close"
        size={28}
        tone="plain"
        label={`Excluir série ${set.set_number}`}
        onPress={onDelete}
      />
    </Animated.View>
  );
}

export function SetHeader({ timed }: { timed?: boolean }) {
  return (
    <View style={[styles.row, { paddingVertical: 0 }]}>
      <Text variant="overline" color="textSubtle" style={styles.num}>
        #
      </Text>
      <Text variant="overline" color="textSubtle" style={styles.prev}>
        Anterior
      </Text>
      <Text variant="overline" color="textSubtle" style={[styles.headCell]}>
        kg
      </Text>
      <Text variant="overline" color="textSubtle" style={[styles.headCell]}>
        {timed ? 'seg' : 'reps'}
      </Text>
      <View style={{ width: 40 }} />
      <View style={{ width: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radii.sm,
  },
  num: { width: 18, textAlign: 'center' },
  prev: { width: 62 },
  headCell: { flex: 1, textAlign: 'center' },
  input: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
