import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { BMI_CATEGORIES } from '@/utils/bmi';
import { formatFixed } from '@/utils/format';

const MIN = 15;
const MAX = 42;

export function BmiScale({ bmi }: { bmi: number }) {
  const { colors } = useTheme();
  const toneColor = {
    info: colors.info,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };
  const pos = Math.min(1, Math.max(0, (bmi - MIN) / (MAX - MIN)));
  return (
    <View
      style={{ gap: spacing.sm }}
      accessibilityLabel={`Escala de IMC, seu valor ${formatFixed(bmi, 2)}`}>
      <View style={{ height: 18 }}>
        <View
          style={{
            position: 'absolute',
            left: `${pos * 100}%`,
            marginLeft: -7,
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderTopWidth: 10,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: colors.text,
            top: 6,
          }}
        />
      </View>
      <View
        style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
        {BMI_CATEGORIES.map((c) => {
          const a = Math.max(MIN, c.min);
          const b = Math.min(MAX, c.max);
          return (
            <View
              key={c.key}
              style={{
                flex: b - a,
                backgroundColor: toneColor[c.tone],
                opacity: bmi >= c.min && bmi < c.max ? 1 : 0.35,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[18.5, 25, 30, 35, 40].map((v) => (
          <Text key={v} variant="caption" color="textSubtle" style={{ fontSize: 10 }}>
            {formatFixed(v, 1)}
          </Text>
        ))}
      </View>
    </View>
  );
}
