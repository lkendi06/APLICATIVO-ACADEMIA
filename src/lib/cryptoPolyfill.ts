import * as ExpoCrypto from 'expo-crypto';

/**
 * O React Native não tem a WebCrypto (`crypto.subtle`). Sem ela, o Supabase usa o
 * método "plain" no PKCE, que é menos seguro. Aqui ligamos `getRandomValues` e
 * `subtle.digest('SHA-256')` às funções nativas do expo-crypto.
 */
type MinimalCrypto = {
  getRandomValues?: typeof ExpoCrypto.getRandomValues;
  subtle?: { digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> };
};

const g = globalThis as unknown as { crypto?: MinimalCrypto };
g.crypto ??= {};
const c = g.crypto;

if (typeof c.getRandomValues !== 'function') {
  c.getRandomValues = ExpoCrypto.getRandomValues;
}

if (typeof c.subtle === 'undefined') {
  c.subtle = {
    digest: (algorithm, data) => {
      const name = typeof algorithm === 'string' ? algorithm.toUpperCase() : algorithm;
      if (name !== 'SHA-256') throw new Error(`Algoritmo não suportado: ${String(algorithm)}`);
      return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
    },
  };
}
