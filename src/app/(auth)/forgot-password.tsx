import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Card, Icon, Screen, Text, TextField } from '@/components/ui';
import { forgotSchema, type ForgotValues } from '@/schemas/auth';
import { authService } from '@/services/auth';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await authService.requestPasswordReset(email);
      setSentTo(email);
    } catch (e) {
      setFormError(friendlyError(e));
    }
  });

  if (sentTo) {
    return (
      <Screen back>
        <Animated.View entering={FadeIn} style={{ gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xxxl }}>
          <Icon name="paper-plane-outline" size={44} color="primaryText" />
          <Text variant="h1" align="center">
            Verifique seu e-mail
          </Text>
          <Text color="textMuted" align="center">
            Se existir uma conta para {sentTo}, você receberá um link para criar uma nova senha. Abra o link
            neste celular.
          </Text>
        </Animated.View>
        <Button title="Voltar para o login" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen back>
      <View style={{ gap: spacing.xs }}>
        <Text variant="h1">Recuperar senha</Text>
        <Text color="textMuted">Informe o e-mail da sua conta e enviaremos um link de redefinição.</Text>
      </View>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            testID="forgot-email"
            label="E-mail"
            icon="mail-outline"
            placeholder="voce@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={() => onSubmit()}
            error={errors.email?.message}
          />
        )}
      />
      {formError ? (
        <Card tone="alt">
          <Text variant="bodySm" color="danger">
            {formError}
          </Text>
        </Card>
      ) : null}
      <Button title="Enviar link" size="lg" loading={isSubmitting} onPress={onSubmit} testID="forgot-submit" />
    </Screen>
  );
}
