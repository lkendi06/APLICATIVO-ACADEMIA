import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import SignIn from '@/app/(auth)/sign-in';
import SignUp from '@/app/(auth)/sign-up';
import { authService } from '@/services/auth';

import { renderWithProviders } from '@/test-utils/render';

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('@/services/auth', () => ({
  authService: {
    signIn: jest.fn(async () => undefined),
    signUp: jest.fn(async () => ({ needsConfirmation: true })),
    resendConfirmation: jest.fn(async () => undefined),
  },
  authRedirects: {
    callback: () => 'fittrack://auth/callback',
    resetPassword: () => 'fittrack://reset-password',
  },
}));

const mocked = authService as jest.Mocked<typeof authService>;

beforeEach(() => jest.clearAllMocks());

describe('Tela de login', () => {
  it('mostra erros de validação e não chama o servidor com campos vazios', async () => {
    await renderWithProviders(<SignIn />);
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('Informe seu e-mail.')).toBeTruthy();
    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
    expect(mocked.signIn).not.toHaveBeenCalled();
  });

  it('envia e-mail, senha e "permanecer conectado"', async () => {
    await renderWithProviders(<SignIn />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'Senha123');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() =>
      expect(mocked.signIn).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'Senha123',
        remember: true,
      }),
    );
  });

  it('mostra mensagem amigável quando a senha está errada', async () => {
    mocked.signIn.mockRejectedValueOnce(
      Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials' }),
    );
    await renderWithProviders(<SignIn />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'errada');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByTestId('sign-in-error')).toBeTruthy();
  });
});

describe('Tela de cadastro', () => {
  it('exige aceite dos termos e senhas iguais', async () => {
    await renderWithProviders(<SignUp />);
    await fireEvent.changeText(screen.getByTestId('sign-up-name'), 'Ana Souza');
    await fireEvent.changeText(screen.getByTestId('sign-up-email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), 'Senha123');
    await fireEvent.changeText(screen.getByTestId('sign-up-confirm'), 'Senha124');
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    expect(await screen.findByText('As senhas não coincidem.')).toBeTruthy();
    expect(screen.getByText('Você precisa aceitar os termos para continuar.')).toBeTruthy();
    expect(mocked.signUp).not.toHaveBeenCalled();
  });

  it('cadastra quando tudo está válido', async () => {
    await renderWithProviders(<SignUp />);
    await fireEvent.changeText(screen.getByTestId('sign-up-name'), 'Ana Souza');
    await fireEvent.changeText(screen.getByTestId('sign-up-email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), 'Senha123');
    await fireEvent.changeText(screen.getByTestId('sign-up-confirm'), 'Senha123');
    await fireEvent.press(screen.getByTestId('sign-up-terms'));
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    await waitFor(() =>
      expect(mocked.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Ana Souza',
          email: 'ana@example.com',
          password: 'Senha123',
        }),
      ),
    );
  });
});
