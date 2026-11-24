import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  value: string;
  icon?: IconName;
  hint?: string;
  trend?: { value: string; positive: boolean } | null;
};

export function StatTile({ label, value, icon, hint, trend }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}>
      <View style={styles.top}>
        {icon ? <Icon name={icon} size={16} color="textMuted" /> : null}
        <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text variant="h2" tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {trend ? (
        <Text variant="caption" style={{ color: trend.positive ? colors.success : colors.danger }}>
          {trend.value}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textSubtle" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
