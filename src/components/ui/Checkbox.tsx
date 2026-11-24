import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

import { Icon } from './Icon';

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  children?: React.ReactNode;
  error?: boolean;
  testID?: string;
};

export function Checkbox({ checked, onChange, label, children, error, testID }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={styles.row}>
      <View
        style={[
          styles.box,
          {
            borderColor: error ? colors.danger : checked ? colors.primary : colors.borderStrong,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}>
        {checked ? <Icon name="checkmark" size={16} color={colors.onPrimary} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  box: {
    width: 22,
    height: 22,
    borderRadius: radii.sm - 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
