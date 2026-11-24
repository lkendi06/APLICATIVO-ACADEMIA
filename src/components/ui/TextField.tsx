import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  icon?: IconName;
  suffix?: string;
  secureToggle?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  icon,
  suffix,
  secureToggle,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.danger : focused ? colors.primaryText : colors.border;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <View style={[styles.box, { borderColor, backgroundColor: colors.surface }]}>
        {icon ? <Icon name={icon} size={18} color="textSubtle" /> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primaryText}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
          {...rest}
        />
        {suffix ? (
          <Text variant="label" color="textSubtle">
            {suffix}
          </Text>
        ) : null}
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="textMuted" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textSubtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    gap: spacing.sm,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: spacing.md },
});
