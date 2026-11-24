import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { authService } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { colors } = useTheme();
  const { toast } = useFeedback();
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    try {
      await authService.resendConfirmation(email);
      toast('E-mail reenviado. Confira sua caixa de entrada.');
      setCooldown(60);
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen back>
      <View style={styles.center}>
        <Animated.View
          entering={ZoomIn.springify()}
          style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Icon name="mail-unread-outline" size={36} color="primaryText" />
        </Animated.View>
        <Text variant="h1" align="center">
          Confirme seu e-mail
        </Text>
        <Text color="textMuted" align="center">
          Enviamos um link de confirmação para{'\n'}
          <Text variant="bodyMedium">{email ?? 'seu e-mail'}</Text>.{'\n'}Abra o link neste celular
          para ativar sua conta.
        </Text>
        <Text variant="caption" color="textSubtle" align="center">
          Não encontrou? Verifique a pasta de spam ou lixo eletrônico.
        </Text>
      </View>
      <Button
        title={cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar e-mail'}
        variant="secondary"
        loading={sending}
        disabled={cooldown > 0 || !email}
        onPress={resend}
      />
      <Button title="Já confirmei, entrar" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  icon: {
    width: 84,
    height: 84,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
