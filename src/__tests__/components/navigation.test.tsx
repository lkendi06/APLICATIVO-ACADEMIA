/**
 * Proteção de rotas: usa o layout raiz real do app (Stack.Protected) com telas simples.
 */
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';

const mockAuth = {
  session: null as null | { user: { id: string } },
  initializing: false,
  recovering: false,
};

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    ...mockAuth,
    user: mockAuth.session?.user ?? null,
    setRecovering: () => undefined,
  }),
  useUserId: () => mockAuth.session?.user.id ?? '',
}));
jest.mock('@/components/PreferencesSync', () => ({ PreferencesSync: () => null }));
// O expo-router registra mocks próprios do Reanimated que substituiriam os do jest.setup.js.
jest.mock('expo-router/build/testing-library/mocks', () => ({}));
jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  createURL: (path: string) => `fittrack://${path}`,
  resolveScheme: () => 'fittrack',
  addEventListener: () => ({ remove() {} }),
}));
jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

const routes = {
  _layout: RootLayout,
  '(auth)/_layout': require('expo-router').Stack,
  '(auth)/index': () => <Text>Tela de boas-vindas</Text>,
  '(auth)/sign-in': () => <Text>Tela de login</Text>,
  '(tabs)/_layout': require('expo-router').Stack,
  '(tabs)/index': () => <Text>Início</Text>,
  'profile/_layout': require('expo-router').Stack,
  'profile/settings': () => <Text>Configurações</Text>,
  'reset-password': () => <Text>Nova senha</Text>,
  legal: () => <Text>Termos</Text>,
};

// As telas de teste não incluem todas as rotas do app; o aviso é esperado.
const realWarn = console.warn;
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes('[Layout children]')) return;
    realWarn(...args);
  });
});
afterAll(() => jest.restoreAllMocks());

describe('proteção de rotas', () => {
  afterEach(() => {
    mockAuth.session = null;
    mockAuth.recovering = false;
  });

  it('sem sessão, mostra a área de autenticação', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Tela de boas-vindas')).toBeTruthy();
  });

  it('sem sessão, uma rota privada não é acessível', async () => {
    await renderRouter(routes, { initialUrl: '/profile/settings' });
    expect(screen.queryByText('Configurações')).toBeNull();
  });

  it('com sessão, abre o app', async () => {
    mockAuth.session = { user: { id: 'u1' } };
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Início')).toBeTruthy();
    expect(screen.queryByText('Tela de boas-vindas')).toBeNull();
  });

  it('páginas públicas (termos) abrem sem login', async () => {
    await renderRouter(routes, { initialUrl: '/legal' });
    expect(await screen.findByText('Termos')).toBeTruthy();
  });
});
