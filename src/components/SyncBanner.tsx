import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { usePendingSync } from '@/hooks/useActiveWorkout';
import { useIsOnline } from '@/hooks/useNetwork';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

/** Informa quando o app está offline ou com registros aguardando envio. */
export function SyncBanner() {
  const { colors } = useTheme();
  const online = useIsOnline();
  const pending = usePendingSync();
  if (online && pending === 0) return null;
  const msg = !online
    ? pending > 0
      ? `Sem internet. ${pending} alteração(ões) salvas no aparelho serão enviadas quando a conexão voltar.`
      : 'Sem internet. Alguns dados podem estar desatualizados.'
    : `Sincronizando ${pending} alteração(ões)…`;
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} accessibilityLiveRegion="polite">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radii.md,
          backgroundColor: online ? colors.surfaceAlt : colors.warningSoft,
        }}>
        <Icon name={online ? 'sync-outline' : 'cloud-offline-outline'} size={18} color={online ? 'textMuted' : 'warning'} />
        <Text variant="caption" style={{ flex: 1, color: online ? colors.textMuted : colors.warning }}>
          {msg}
        </Text>
      </View>
    </Animated.View>
  );
}
