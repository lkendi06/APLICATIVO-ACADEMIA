import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type ImageStyle, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { EXERCISE_MEDIA } from '@/constants/exerciseMedia';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

type Props = {
  mediaKey: string | null | undefined;
  mediaUrl?: string | null;
  name: string;
  /** true = GIF animado; false = imagem estática (listas longas economizam CPU). */
  animated?: boolean;
  size?: number;
  style?: ViewStyle;
  rounded?: number;
};

/**
 * Exibe a demonstração do exercício.
 * - GIFs originais empacotados no app (carregamento instantâneo e offline).
 * - URL remota opcional (Supabase Storage) com cache em memória e disco.
 * - Imagem estática como placeholder e fallback se o GIF não carregar.
 */
export function ExerciseMedia({
  mediaKey,
  mediaUrl,
  name,
  animated = true,
  size,
  style,
  rounded = radii.md,
}: Props) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const local = mediaKey ? EXERCISE_MEDIA[mediaKey] : undefined;
  const dims = size ? { width: size, height: size } : { width: '100%' as const, aspectRatio: 1 };

  const source = failed
    ? local?.poster
    : animated
      ? mediaUrl
        ? { uri: mediaUrl }
        : local?.gif
      : (local?.poster ?? (mediaUrl ? { uri: mediaUrl } : undefined));

  if (!source) {
    return (
      <View
        style={[
          styles.fallback,
          dims,
          { backgroundColor: colors.surfaceAlt, borderRadius: rounded },
          style,
        ]}
        accessibilityLabel={`Sem demonstração para ${name}`}>
        <Icon name="barbell-outline" size={size ? size * 0.4 : 40} color="textSubtle" />
        {!size || size > 100 ? (
          <Text variant="caption" color="textSubtle">
            Demonstração indisponível
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={source}
      placeholder={local?.poster}
      placeholderContentFit="contain"
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={150}
      autoplay={animated}
      recyclingKey={mediaKey ?? mediaUrl ?? name}
      onError={() => setFailed(true)}
      accessibilityLabel={`Demonstração animada: ${name}`}
      style={[
        dims,
        { borderRadius: rounded, backgroundColor: colors.surface },
        style as ImageStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', gap: 6 },
});
