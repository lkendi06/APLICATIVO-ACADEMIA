import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { PasswordStrength } from '@/components/PasswordStrength';
import { Button, Card, Icon, LoadingView, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { resetSchema, type ResetValues } from '@/schemas/auth';
import { authService } from '@/services/auth';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

type Phase = 'verifying' | 'form' | 'done' | 'invalid';

export default function ResetPassword() {
  const url = Linking.useLinkingURL();
  const { session, setRecovering } = useAuth();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    setRecovering(true);
  }, [setRecovering]);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    (async () => {
      try {
        const result = url ? await authService.handleAuthUrl(url) : 'none';
        if (result === 'ok' || session) setPhase('form');
        else setPhase('invalid');
      } catch (e) {
        setError(friendlyError(e));
        setPhase('invalid');
      }
    })();
  }, [url, session]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await authService.updatePassword(password);
      setPhase('done');
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  const finish = () => {
    setRecovering(false);
    router.replace('/');
  };

  if (phase === 'verifying') return <LoadingView label="Validando link…" />;

  if (phase === 'invalid') {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.huge }}>
          <Icon name="link-outline" size={40} color="danger" />
          <Text variant="h2" align="center">
            Link inválido ou expirado
          </Text>
          <Text color="textMuted" align="center">
            {error ?? 'Solicite um novo link de recuperação de senha.'}
          </Text>
        </View>
        <Button
          title="Solicitar novo link"
          onPress={() => {
            setRecovering(false);
            router.replace('/forgot-password');
          }}
        />
      </Screen>
    );
  }

  if (phase === 'done') {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.huge }}>
          <Animated.View entering={ZoomIn.springify()}>
            <Icon name="checkmark-circle" size={64} color="success" />
          </Animated.View>
          <Text variant="h1" align="center">
            Senha alterada!
          </Text>
          <Text color="textMuted" align="center">
            Sua nova senha já está valendo.
          </Text>
        </View>
        <Button title="Continuar" size="lg" onPress={finish} testID="reset-done" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginTop: spacing.xl }}>
        <Text variant="h1">Criar nova senha</Text>
        <Text color="textMuted">Escolha uma senha forte que você ainda não usou.</Text>
      </View>
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <TextField
              label="Nova senha"
              icon="lock-closed-outline"
              secureToggle
              autoComplete="new-password"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
            <PasswordStrength password={watch('password')} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextField
            label="Confirmar nova senha"
            icon="lock-closed-outline"
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            error={errors.confirmPassword?.message}
          />
        )}
      />
      {error ? (
        <Card tone="alt">
          <Text variant="bodySm" color="danger">
            {error}
          </Text>
        </Card>
      ) : null}
      <Button title="Salvar nova senha" size="lg" loading={isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
