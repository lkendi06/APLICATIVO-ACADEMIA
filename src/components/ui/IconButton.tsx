import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  tone?: 'default' | 'primary' | 'danger' | 'plain';
  disabled?: boolean;
  testID?: string;
};

export function IconButton({
  icon,
  onPress,
  label,
  size = 40,
  tone = 'default',
  disabled,
  testID,
}: Props) {
  const { colors } = useTheme();
  const bg =
    tone === 'primary'
      ? colors.primary
      : tone === 'danger'
        ? colors.dangerSoft
        : tone === 'plain'
          ? 'transparent'
          : colors.surfaceAlt;
  const fg =
    tone === 'primary' ? colors.onPrimary : tone === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}>
      <Icon name={icon} size={size * 0.5} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
