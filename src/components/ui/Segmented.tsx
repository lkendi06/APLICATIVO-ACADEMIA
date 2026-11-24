import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

import { Text } from './Text';

type Props<T extends string> = {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  scrollable?: boolean;
};

export function Segmented<T extends string>({ options, value, onChange, scrollable }: Props<T>) {
  const { colors } = useTheme();
  const items = options.map((o) => {
    const active = o.key === value;
    return (
      <Pressable
        key={o.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={o.label}
        onPress={() => onChange(o.key)}
        style={[
          styles.item,
          !scrollable && { flex: 1 },
          { backgroundColor: active ? colors.surfaceRaised : 'transparent' },
          active && { borderColor: colors.borderStrong, borderWidth: StyleSheet.hairlineWidth },
        ]}>
        <Text variant="label" color={active ? 'text' : 'textMuted'} numberOfLines={1}>
          {o.label}
        </Text>
      </Pressable>
    );
  });
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
          {items}
        </ScrollView>
      ) : (
        items
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, borderRadius: radii.md, gap: 4 },
  item: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
