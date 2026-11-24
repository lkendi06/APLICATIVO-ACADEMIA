import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

import { Button } from './Button';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export function LoadingView({ label = 'Carregando…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} />
      <Text variant="bodySm" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

export function ListSkeleton({ rows = 4, height = 72 }: { rows?: number; height?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} radius={16} />
      ))}
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <Icon name="cloud-offline-outline" size={32} color="danger" />
      <Text variant="bodyMedium" align="center">
        Não foi possível carregar
      </Text>
      <Text variant="bodySm" color="textMuted" align="center">
        {friendlyError(error)}
      </Text>
      {onRetry ? (
        <Button title="Tentar novamente" variant="secondary" size="sm" onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
});
