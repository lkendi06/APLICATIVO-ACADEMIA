/** Garante que o PKCE use SHA-256 mesmo sem WebCrypto (caso do React Native). */
const mockDigest = jest.fn(async () => new ArrayBuffer(32));
const mockRandom = jest.fn((a: Uint8Array) => a);

jest.mock('expo-crypto', () => ({
  digest: mockDigest,
  getRandomValues: mockRandom,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

describe('cryptoPolyfill', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  beforeEach(() => {
    jest.resetModules();
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });
  afterAll(() => {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
  });

  it('cria crypto.subtle.digest e getRandomValues usando o expo-crypto', async () => {
    require('@/lib/cryptoPolyfill');
    const c = (globalThis as unknown as { crypto: Crypto }).crypto;
    expect(typeof c.subtle.digest).toBe('function');
    await c.subtle.digest('SHA-256', new Uint8Array([1, 2, 3]));
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', new Uint8Array([1, 2, 3]));
    c.getRandomValues(new Uint8Array(4));
    expect(mockRandom).toHaveBeenCalled();
  });

  it('recusa algoritmos que não sejam SHA-256', () => {
    require('@/lib/cryptoPolyfill');
    const c = (globalThis as unknown as { crypto: Crypto }).crypto;
    expect(() => c.subtle.digest('SHA-1', new Uint8Array())).toThrow('Algoritmo não suportado');
  });
});
