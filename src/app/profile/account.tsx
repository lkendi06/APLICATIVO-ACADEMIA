import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform } from 'react-native';
import { z } from 'zod';

import { PasswordStrength } from '@/components/PasswordStrength';
import { Button, Card, Screen, SectionHeader, Text, TextField } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedback } from '@/contexts/FeedbackContext';
import { supabase } from '@/lib/supabase';
import { changePasswordSchema, type ChangePasswordValues } from '@/schemas/auth';
import { accountService } from '@/services/account';
import { authService } from '@/services/auth';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';

const emailSchema = z.object({
  email: z.string().trim().min(1, 'Informe o novo e-mail.').email('E-mail inválido.'),
});

const DELETE_WORD = 'EXCLUIR';

export default function AccountScreen() {
  const { user } = useAuth();
  const { toast, confirm } = useFeedback();
  const [exporting, setExporting] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const pwForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: '', password: '', confirmPassword: '' },
  });

  const changeEmail = emailForm.handleSubmit(async ({ email }) => {
    if (email.trim().toLowerCase() === user?.email) {
      emailForm.setError('email', { message: 'Este já é o seu e-mail.' });
      return;
    }
    try {
      await authService.updateEmail(email);
      setEmailSent(email.trim().toLowerCase());
      emailForm.reset();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  });

  const changePassword = pwForm.handleSubmit(async ({ current, password }) => {
    if (!user?.email) return;
    // Confirma a senha atual antes de trocar (reautenticação).
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (error) {
      pwForm.setError('current', { message: 'Senha atual incorreta.' });
      return;
    }
    try {
      await authService.updatePassword(password);
      pwForm.reset();
      toast('Senha alterada com sucesso.');
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  });

  async function exportData() {
    setExporting(true);
    try {
      const { json } = await accountService.exportData();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fittrack-dados-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      toast('Exportação gerada.');
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (!user) return;
    const ok = await confirm({
      title: 'Excluir conta definitivamente?',
      message:
        'Todos os seus treinos, sessões, medições, objetivos e fotos serão apagados. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir tudo',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await accountService.deleteAccount(user.id);
      // A sessão é encerrada e a navegação volta para a tela de boas-vindas.
    } catch (e) {
      toast(friendlyError(e), 'error');
      setDeleting(false);
    }
  }

  const newPw = pwForm.watch('password');

  return (
    <Screen title="Segurança e dados" back>
      <SectionHeader title="E-mail" />
      <Card style={{ gap: spacing.md }}>
        <Text variant="bodySm" color="textMuted">
          E-mail atual: <Text variant="bodySm">{user?.email}</Text>
        </Text>
        {user?.new_email ? (
          <Text variant="caption" color="warning">
            Alteração pendente para {user.new_email}. Confirme pelo link enviado.
          </Text>
        ) : null}
        <Controller
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Novo e-mail"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={emailForm.formState.errors.email?.message}
            />
          )}
        />
        {emailSent ? (
          <Text variant="caption" color="success">
            Enviamos um link de confirmação para {emailSent}. A troca só vale depois da confirmação.
          </Text>
        ) : null}
        <Button
          title="Alterar e-mail"
          variant="secondary"
          onPress={changeEmail}
          loading={emailForm.formState.isSubmitting}
        />
      </Card>

      <SectionHeader title="Senha" />
      <Card style={{ gap: spacing.md }}>
        <Controller
          control={pwForm.control}
          name="current"
          render={({ field }) => (
            <TextField
              label="Senha atual"
              value={field.value}
              onChangeText={field.onChange}
              secureTextEntry
              secureToggle
              autoComplete="current-password"
              error={pwForm.formState.errors.current?.message}
            />
          )}
        />
        <Controller
          control={pwForm.control}
          name="password"
          render={({ field }) => (
            <TextField
              label="Nova senha"
              value={field.value}
              onChangeText={field.onChange}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              error={pwForm.formState.errors.password?.message}
            />
          )}
        />
        {newPw ? <PasswordStrength password={newPw} /> : null}
        <Controller
          control={pwForm.control}
          name="confirmPassword"
          render={({ field }) => (
            <TextField
              label="Confirmar nova senha"
              value={field.value}
              onChangeText={field.onChange}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              error={pwForm.formState.errors.confirmPassword?.message}
            />
          )}
        />
        <Button
          title="Alterar senha"
          variant="secondary"
          onPress={changePassword}
          loading={pwForm.formState.isSubmitting}
        />
      </Card>

      <SectionHeader title="Seus dados" />
      <Card style={{ gap: spacing.md }}>
        <Text variant="bodySm" color="textMuted">
          Baixe um arquivo JSON com seu perfil, treinos, sessões, séries, medições e objetivos.
        </Text>
        <Button
          title="Exportar meus dados"
          icon="download-outline"
          variant="secondary"
          onPress={exportData}
          loading={exporting}
          testID="account-export"
        />
      </Card>

      <SectionHeader title="Zona de perigo" />
      <Card style={{ gap: spacing.md }}>
        <Text variant="bodySm" color="textMuted">
          A exclusão apaga sua conta e todos os dados associados de forma permanente. Para
          continuar, digite {DELETE_WORD}.
        </Text>
        <TextField
          label={`Digite ${DELETE_WORD}`}
          value={deleteText}
          onChangeText={setDeleteText}
          autoCapitalize="characters"
          testID="account-delete-input"
        />
        <Button
          title="Excluir minha conta"
          variant="danger"
          icon="trash-outline"
          onPress={deleteAccount}
          loading={deleting}
          disabled={deleteText.trim().toUpperCase() !== DELETE_WORD}
          testID="account-delete"
        />
      </Card>
    </Screen>
  );
}
