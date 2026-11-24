import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { Button, Card, Checkbox, Screen, Text, TextField } from '@/components/ui';
import { signInSchema, type SignInValues } from '@/schemas/auth';
import { authService } from '@/services/auth';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

export default function SignIn() {
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setUnconfirmedEmail(null);
    try {
      await authService.signIn(values);
      // O layout raiz redireciona automaticamente ao detectar a sessão.
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'email_not_confirmed') setUnconfirmedEmail(values.email);
      setFormError(friendlyError(e));
    }
  });

  return (
    <Screen back>
      <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
        <Logo size={36} />
        <Text variant="h1" style={{ marginTop: spacing.lg }}>
          Bem-vindo de volta
        </Text>
        <Text color="textMuted">Entre para continuar seus treinos.</Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            testID="sign-in-email"
            label="E-mail"
            icon="mail-outline"
            placeholder="voce@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
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
          <TextField
            testID="sign-in-password"
            label="Senha"
            icon="lock-closed-outline"
            placeholder="Sua senha"
            secureToggle
            autoComplete="current-password"
            textContentType="password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={() => onSubmit()}
            error={errors.password?.message}
          />
        )}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Controller
          control={control}
          name="remember"
          render={({ field }) => (
            <Checkbox label="Permanecer conectado" checked={field.value} onChange={field.onChange}>
              <Text variant="bodySm">Permanecer conectado</Text>
            </Checkbox>
          )}
        />
        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text variant="label" color="primaryText">
              Esqueci a senha
            </Text>
          </Pressable>
        </Link>
      </View>

      {formError ? (
        <Card tone="alt" style={{ borderColor: 'transparent' }}>
          <Text
            variant="bodySm"
            color="danger"
            testID="sign-in-error"
            accessibilityLiveRegion="polite">
            {formError}
          </Text>
          {unconfirmedEmail ? (
            <Button
              title="Reenviar e-mail de confirmação"
              variant="ghost"
              size="sm"
              style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
              onPress={() =>
                router.push({ pathname: '/verify-email', params: { email: unconfirmedEmail } })
              }
            />
          ) : null}
        </Card>
      ) : null}

      <Button
        title="Entrar"
        size="lg"
        loading={isSubmitting}
        onPress={onSubmit}
        testID="sign-in-submit"
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
        <Text variant="bodySm" color="textMuted">
          Ainda não tem conta?
        </Text>
        <Link href="/sign-up" replace asChild>
          <Pressable accessibilityRole="link">
            <Text variant="label" color="primaryText">
              Criar conta
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
