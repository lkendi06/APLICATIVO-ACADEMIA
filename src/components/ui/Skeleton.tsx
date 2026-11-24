import { useEffect } from 'react';
import { type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export function Skeleton({
  height = 16,
  width = '100%',
  radius = radii.sm,
  style,
}: {
  height?: number;
  width?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityLabel="Carregando"
      style={[{ height, width, borderRadius: radius, backgroundColor: colors.skeleton }, animated, style]}
    />
  );
}
