import { View } from 'react-native';

import { Text } from '@/components/ui';
import { passwordStrength } from '@/schemas/auth';
import { useTheme } from '@/theme/ThemeProvider';

const LABELS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];

export function PasswordStrength({ password }: { password: string }) {
  const { colors } = useTheme();
  if (!password) return null;
  const score = passwordStrength(password);
  const color = score <= 1 ? colors.danger : score === 2 ? colors.warning : colors.success;
  return (
    <View style={{ gap: 6 }} accessibilityLabel={`Força da senha: ${LABELS[score]}`}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < score ? color : colors.surfaceAlt,
            }}
          />
        ))}
      </View>
      <Text variant="caption" style={{ color }}>
        {LABELS[score]}
      </Text>
    </View>
  );
}
