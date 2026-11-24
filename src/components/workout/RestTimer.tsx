import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { Button, IconButton, Text } from '@/components/ui';
import { useActiveWorkout, useNow } from '@/hooks/useActiveWorkout';
import { activeWorkout } from '@/services/activeWorkout';
import { notificationService } from '@/services/notifications';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadows, spacing } from '@/theme/tokens';
import { formatClock } from '@/utils/format';

/** Cronômetro de descanso: sobrevive ao fechamento do app (salvo no estado do treino). */
export function RestTimer() {
  const { colors } = useTheme();
  const state = useActiveWorkout();
  const rest = state?.rest ?? null;
  const now = useNow(250, !!rest);
  const notificationId = useRef<string | null>(null);
  const scheduledFor = useRef<number | null>(null);

  // Notificação local para quando o app estiver em segundo plano.
  useEffect(() => {
    if (!rest) {
      notificationService.cancel(notificationId.current);
      notificationId.current = null;
      scheduledFor.current = null;
      return;
    }
    if (scheduledFor.current === rest.endsAt) return;
    notificationService.cancel(notificationId.current);
    scheduledFor.current = rest.endsAt;
    const secs = Math.round((rest.endsAt - Date.now()) / 1000);
    if (secs > 2) {
      notificationService
        .scheduleRestEnd(secs, rest.exerciseName)
        .then((id) => (notificationId.current = id))
        .catch(() => undefined);
    }
  }, [rest]);

  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (rest && remaining === 0) {
      if (Platform.OS !== 'web')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      activeWorkout.stopRest();
    }
  }, [rest, remaining]);

  if (!rest) return null;
  const progress = rest.total ? 1 - remaining / rest.total : 1;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(200)}
      style={[
        styles.box,
        shadows.card,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Descanso: ${remaining} segundos restantes`}>
      <View style={[styles.progress, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            height: '100%',
            backgroundColor: colors.primary,
            borderRadius: 3,
          }}
        />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="textMuted">
            Descanso
          </Text>
          <Text variant="number" tabular>
            {formatClock(remaining)}
          </Text>
        </View>
        <IconButton
          icon="remove"
          label="Diminuir 15 segundos"
          onPress={() => activeWorkout.adjustRest(-15)}
        />
        <IconButton
          icon="add"
          label="Aumentar 15 segundos"
          onPress={() => activeWorkout.adjustRest(15)}
        />
        <Button
          title="Pular"
          size="sm"
          variant="secondary"
          onPress={() => activeWorkout.stopRest()}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progress: { height: 6, borderRadius: 3, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
