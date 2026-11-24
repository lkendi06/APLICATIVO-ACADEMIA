import * as Crypto from 'expo-crypto';

/** UUID v4 gerado no aparelho: permite salvar offline e reenviar sem duplicar. */
export function uuid(): string {
  return Crypto.randomUUID();
}
