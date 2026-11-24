import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export function LogoMark({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="FitTrack">
      <Rect x="0" y="0" width="48" height="48" rx="14" fill={colors.primary} />
      <Path
        d="M10 30 L18 30 L22 18 L27 36 L31 24 L38 24"
        stroke={colors.onPrimary}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <Text variant="h2" style={{ fontSize: size * 0.6, lineHeight: size * 0.75 }}>
        FitTrack
      </Text>
    </View>
  );
}
