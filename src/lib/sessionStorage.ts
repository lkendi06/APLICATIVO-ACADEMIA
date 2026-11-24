import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Armazenamento da sessão do Supabase.
 *
 * - No celular, os tokens ficam no Keychain (iOS) / Keystore (Android) via SecureStore.
 *   O SecureStore aceita valores pequenos, então o JSON da sessão é dividido em partes.
 * - "Permanecer conectado" desligado: a sessão fica só na memória e some ao fechar o app.
 * - Na web (apenas para desenvolvimento) usa AsyncStorage/localStorage.
 */

const CHUNK_SIZE = 1800;
const REMEMBER_KEY = 'fittrack.remember-me';
const memory = new Map<string, string>();
let rememberMe = true;
let rememberLoaded = false;

async function loadRemember() {
  if (rememberLoaded) return;
  rememberLoaded = true;
  try {
    rememberMe = (await AsyncStorage.getItem(REMEMBER_KEY)) !== 'false';
  } catch {
    rememberMe = true;
  }
}

export async function setRememberMe(value: boolean): Promise<void> {
  rememberMe = value;
  rememberLoaded = true;
  await AsyncStorage.setItem(REMEMBER_KEY, value ? 'true' : 'false');
}

export async function getRememberMe(): Promise<boolean> {
  await loadRemember();
  return rememberMe;
}

const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

const secure = {
  async getItem(key: string): Promise<string | null> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}.n`);
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(`${k}.${i}`);
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const k = safeKey(key);
    await secure.removeItem(key);
    const chunks = Math.ceil(value.length / CHUNK_SIZE) || 1;
    for (let i = 0; i < chunks; i++) {
      await SecureStore.setItemAsync(
        `${k}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    await SecureStore.setItemAsync(`${k}.n`, String(chunks));
  },
  async removeItem(key: string): Promise<void> {
    const k = safeKey(key);
    const count = Number((await SecureStore.getItemAsync(`${k}.n`)) ?? 0);
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
    await SecureStore.deleteItemAsync(`${k}.n`);
  },
};

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    await loadRemember();
    if (memory.has(key)) return memory.get(key) ?? null;
    if (!rememberMe) return null;
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return secure.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await loadRemember();
    memory.set(key, value);
    if (!rememberMe) return;
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    return secure.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    memory.delete(key);
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return secure.removeItem(key);
  },
};

/** Remove a sessão persistida (usado quando o usuário desmarca "permanecer conectado"). */
export async function clearPersistedSession(key: string): Promise<void> {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
  return secure.removeItem(key);
}
