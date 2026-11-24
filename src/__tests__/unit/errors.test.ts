import { friendlyError } from '@/utils/errors';

describe('friendlyError', () => {
  it('mostra o servidor quando o endereço não é encontrado (iOS)', () => {
    const e = new Error('fetch failed: A server with the specified hostname could not be found.');
    expect(friendlyError(e)).toContain('test-project.supabase.co');
    expect(friendlyError(e)).toContain('.env');
  });
  it('erro de rede genérico também mostra o servidor', () => {
    expect(friendlyError(new Error('Network request failed'))).toContain(
      'test-project.supabase.co',
    );
  });
  it('traduz credenciais inválidas', () => {
    expect(
      friendlyError({ message: 'Invalid login credentials', code: 'invalid_credentials' }),
    ).toBe('E-mail ou senha incorretos.');
  });
});
