import { useSyncedState } from '@/hooks/useSyncedState';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii, spacing } from '@/theme/tokens';
import { formatNumber, parseDecimal } from '@/utils/format';

import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  suffix?: string;
  compact?: boolean;
  testID?: string;
};

/** Campo numérico com botões − / + e digitação livre (aceita vírgula). */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  decimals = 0,
  suffix,
  compact,
  testID,
}: Props) {
  const { colors } = useTheme();
  const [text, setText] = useSyncedState(formatNumber(value, decimals));

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  const commit = () => {
    const n = parseDecimal(text);
    if (n == null) setText(formatNumber(value, decimals));
    else onChange(clamp(n));
  };

  return (
    <View style={{ gap: spacing.xs, flex: compact ? 1 : undefined }}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <View style={[styles.row, { backgroundColor: colors.surfaceAlt, height: compact ? 44 : 50 }]}>
        <IconButton
          icon="remove"
          label={`Diminuir ${label}`}
          size={compact ? 32 : 36}
          tone="plain"
          disabled={value <= min}
          onPress={() => onChange(clamp(value - step))}
        />
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.input, { color: colors.text }]}
        />
        {suffix ? (
          <Text variant="caption" color="textSubtle">
            {suffix}
          </Text>
        ) : null}
        <IconButton
          icon="add"
          label={`Aumentar ${label}`}
          size={compact ? 32 : 36}
          tone="plain"
          disabled={value >= max}
          onPress={() => onChange(clamp(value + step))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, paddingHorizontal: 4 },
  input: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    minWidth: 40,
  },
});
