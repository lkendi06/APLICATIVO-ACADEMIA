import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Logo } from '@/components/Logo';
import { Button, Text } from '@/components/ui';
import { EXERCISE_MEDIA } from '@/constants/exerciseMedia';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

const FEATURES = [
  { icon: 'barbell-outline', text: 'Monte treinos e registre cada série' },
  { icon: 'stats-chart-outline', text: 'Acompanhe cargas, peso e medidas' },
  { icon: 'play-circle-outline', text: 'Veja a execução animada dos exercícios' },
] as const;

export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Logo />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image
          source={EXERCISE_MEDIA['agachamento-livre'].gif}
          style={styles.heroImage}
          contentFit="contain"
          accessibilityLabel="Animação de agachamento"
        />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(220).duration(500)} style={{ gap: spacing.sm }}>
        <Text variant="display">Seu treino,{'\n'}sua evolução.</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {FEATURES.map((f) => (
            <Text key={f.text} variant="bodySm" color="textMuted">
              •  {f.text}
            </Text>
          ))}
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(320).duration(500)} style={{ gap: spacing.md }}>
        <Button title="Criar conta grátis" size="lg" onPress={() => router.push('/sign-up')} testID="welcome-sign-up" />
        <Button title="Já tenho conta" size="lg" variant="outline" onPress={() => router.push('/sign-in')} testID="welcome-sign-in" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xxl, justifyContent: 'space-between', gap: spacing.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hero: { flex: 1, maxHeight: 320, borderRadius: radii.xxl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },
});
