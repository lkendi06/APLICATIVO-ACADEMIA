import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { PasswordStrength } from '@/components/PasswordStrength';
import { Button, Card, Checkbox, Screen, Text, TextField } from '@/components/ui';
import { signUpSchema, type SignUpValues } from '@/schemas/auth';
import { authService } from '@/services/auth';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

export default function SignUp() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });
  const password = watch('password');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { needsConfirmation } = await authService.signUp(values);
      if (needsConfirmation) {
        router.replace({
          pathname: '/verify-email',
          params: { email: values.email.trim().toLowerCase() },
        });
      }
      // Sem confirmação obrigatória, a sessão já existe e o app abre automaticamente.
    } catch (e) {
      setFormError(friendlyError(e));
    }
  });

  return (
    <Screen back>
      <View style={{ gap: spacing.xs }}>
        <Text variant="h1">Criar sua conta</Text>
        <Text color="textMuted">Leva menos de um minuto.</Text>
      </View>

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            testID="sign-up-name"
            label="Nome completo"
            icon="person-outline"
            placeholder="Seu nome e sobrenome"
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.fullName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            testID="sign-up-email"
            label="E-mail"
            icon="mail-outline"
            placeholder="voce@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <TextField
              testID="sign-up-password"
              label="Senha"
              icon="lock-closed-outline"
              placeholder="Mínimo de 8 caracteres"
              secureToggle
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
              hint="Use letras maiúsculas, minúsculas e números."
            />
            <PasswordStrength password={password} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextField
            testID="sign-up-confirm"
            label="Confirmar senha"
            icon="lock-closed-outline"
            placeholder="Repita a senha"
            secureToggle
            autoComplete="new-password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmPassword?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field }) => (
          <View style={{ gap: spacing.xs }}>
            <Checkbox
              testID="sign-up-terms"
              label="Aceito os termos de uso e a política de privacidade"
              checked={field.value}
              onChange={field.onChange}
              error={!!errors.acceptTerms}>
              <Text variant="bodySm">
                Li e aceito os{' '}
                <Text
                  variant="bodySm"
                  color="primaryText"
                  onPress={() => router.push('/legal?doc=terms')}>
                  Termos de Uso
                </Text>{' '}
                e a{' '}
                <Text
                  variant="bodySm"
                  color="primaryText"
                  onPress={() => router.push('/legal?doc=privacy')}>
                  Política de Privacidade
                </Text>
                .
              </Text>
            </Checkbox>
            {errors.acceptTerms ? (
              <Text variant="caption" color="danger">
                {errors.acceptTerms.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      {formError ? (
        <Card tone="alt">
          <Text
            variant="bodySm"
            color="danger"
            testID="sign-up-error"
            accessibilityLiveRegion="polite">
            {formError}
          </Text>
        </Card>
      ) : null}

      <Button
        title="Criar conta"
        size="lg"
        loading={isSubmitting}
        onPress={onSubmit}
        testID="sign-up-submit"
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
        <Text variant="bodySm" color="textMuted">
          Já tem conta?
        </Text>
        <Link href="/sign-in" replace asChild>
          <Pressable accessibilityRole="link">
            <Text variant="label" color="primaryText">
              Entrar
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
