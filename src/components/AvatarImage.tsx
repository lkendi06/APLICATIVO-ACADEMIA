import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useAvatarUrl } from '@/hooks/queries';
import { useTheme } from '@/theme/ThemeProvider';

export function AvatarImage({
  path,
  name,
  size = 44,
}: {
  path?: string | null;
  name?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const { data: url } = useAvatarUrl(path);
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        cachePolicy="memory-disk"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceAlt,
        }}
        accessibilityLabel="Foto de perfil"
      />
    );
  }
  return (
    <View
      accessibilityLabel="Foto de perfil"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text variant="label" color="primaryText" style={{ fontSize: size * 0.36 }}>
        {initials || '🙂'}
      </Text>
    </View>
  );
}
