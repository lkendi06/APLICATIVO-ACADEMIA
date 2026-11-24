import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Icon, LoadingView, Screen, Text } from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { authService } from '@/services/auth';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

/** Recebe o link de confirmação de e-mail (deep link fittrack://auth/callback). */
export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  const { toast } = useFeedback();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (!url || handled.current) return;
    handled.current = true;
    authService
      .handleAuthUrl(url)
      .then((r) => {
        if (r === 'ok') toast('E-mail confirmado! Bem-vindo ao FitTrack.');
        router.replace('/');
      })
      .catch((e) => setError(friendlyError(e)));
  }, [url, toast]);

  if (!error) return <LoadingView label="Confirmando…" />;
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.huge }}>
        <Icon name="alert-circle-outline" size={40} color="danger" />
        <Text variant="h2" align="center">
          Não foi possível confirmar
        </Text>
        <Text color="textMuted" align="center">
          {error}
        </Text>
      </View>
      <Button title="Ir para o login" onPress={() => router.replace('/')} />
    </Screen>
  );
}
