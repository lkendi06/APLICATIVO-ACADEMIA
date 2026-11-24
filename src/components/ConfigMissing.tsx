import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

/** Exibida quando o .env não foi configurado (evita telas quebradas). */
export function ConfigMissing() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top + spacing.xxl },
      ]}>
      <Icon name="construct-outline" size={40} color="warning" />
      <Text variant="h2">Configuração necessária</Text>
      <Text color="textMuted">
        O FitTrack precisa das credenciais do Supabase para funcionar. Crie o arquivo .env na raiz
        do projeto a partir do .env.example e reinicie o servidor do Expo.
      </Text>
      <Card tone="alt">
        <Text variant="caption" style={{ fontFamily: 'monospace' }}>
          EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY=...
        </Text>
      </Card>
      <Text variant="caption" color="textSubtle">
        Veja docs/setup.md para o passo a passo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, padding: spacing.xxl, gap: spacing.lg } });
