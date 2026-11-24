import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

type Props = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  tone?: 'default' | 'alt' | 'primary' | 'accent';
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
};

export function Card({
  onPress,
  padded = true,
  tone = 'default',
  style,
  children,
  accessibilityLabel,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const bg =
    tone === 'alt'
      ? colors.surfaceAlt
      : tone === 'primary'
        ? colors.primarySoft
        : tone === 'accent'
          ? colors.accentSoft
          : colors.surface;
  const base = [
    styles.card,
    { backgroundColor: bg, borderColor: colors.border, padding: padded ? spacing.lg : 0 },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          ...base,
          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}
        {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
});
