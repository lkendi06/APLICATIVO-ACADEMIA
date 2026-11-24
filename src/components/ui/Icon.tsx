import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme/ThemeProvider';
import type { ColorTokens } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: keyof ColorTokens | (string & {});
};

export function Icon({ name, size = 22, color = 'text' }: Props) {
  const { colors } = useTheme();
  const resolved =
    color in colors ? (colors[color as keyof ColorTokens] as string) : (color as string);
  return <Ionicons name={name} size={size} color={resolved} accessibilityElementsHidden />;
}
