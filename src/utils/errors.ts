/** Converte erros técnicos em mensagens claras em português. */
export function friendlyError(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
  const code =
    error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
  const msg = raw.toLowerCase();

  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists'))
    return 'Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
    return 'E-mail ou senha incorretos.';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (code === 'weak_password' || msg.includes('password should'))
    return 'A senha é fraca. Use ao menos 8 caracteres com letras maiúsculas, minúsculas e números.';
  if (code === 'same_password') return 'A nova senha precisa ser diferente da atual.';
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit') || code === 'over_request_rate_limit')
    return 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.';
  if (msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('network'))
    return 'Sem conexão com o servidor. Verifique sua internet.';
  if (code === 'otp_expired' || msg.includes('expired'))
    return 'Este link expirou. Solicite um novo.';
  if (code === '23505') return 'Este registro já existe.';
  if (code === '23514') return 'Algum valor está fora do permitido. Revise os campos.';
  if (code === '42501') return 'Você não tem permissão para esta ação.';
  return raw ? `Algo deu errado: ${raw}` : 'Algo deu errado. Tente novamente.';
}

export function isNetworkError(error: unknown): boolean {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : String(error ?? '').toLowerCase();
  return raw.includes('network') || raw.includes('failed to fetch') || raw.includes('timeout');
}
