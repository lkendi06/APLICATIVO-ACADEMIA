import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { isNetworkError } from '@/utils/errors';

/**
 * Fila de sincronização (outbox) para registros de treino.
 *
 * Cada alteração é salva primeiro no aparelho e depois enviada ao Supabase.
 * As operações usam IDs gerados no app e `upsert`, então reenviar a mesma
 * operação nunca cria registros duplicados. Se a internet cair, a fila é mantida
 * no AsyncStorage e enviada quando a conexão voltar.
 */

export type SyncTable = 'workout_sessions' | 'workout_session_exercises' | 'workout_sets';

export type OutboxOp = {
  key: string; // `${table}:${id}`
  table: SyncTable;
  kind: 'upsert' | 'delete';
  id: string;
  payload?: Record<string, unknown>;
  attempts: number;
  lastError?: string;
};

type Listener = () => void;

const STORAGE_KEY = 'fittrack.outbox.v1';
const MAX_ATTEMPTS = 5;

let queue: OutboxOp[] = [];
let loaded = false;
let flushing: Promise<FlushResult> | null = null;
let lastError: string | null = null;
const listeners = new Set<Listener>();

export type FlushResult = { sent: number; pending: number; offline: boolean; failed: OutboxOp[] };

function emit() {
  listeners.forEach((l) => l());
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function loadOutbox(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    queue = raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  } catch {
    queue = [];
  }
  loaded = true;
  emit();
}

export function subscribeOutbox(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getOutboxSnapshot() {
  return queue;
}

export function getLastSyncError() {
  return lastError;
}

export async function enqueue(op: Omit<OutboxOp, 'key' | 'attempts'>): Promise<void> {
  await loadOutbox();
  const key = `${op.table}:${op.id}`;
  const idx = queue.findIndex((q) => q.key === key);
  if (op.kind === 'upsert') {
    if (idx >= 0 && queue[idx].kind === 'upsert') {
      // Junta com a operação pendente (mesma linha) em vez de duplicar.
      const merged = { ...queue[idx], payload: { ...queue[idx].payload, ...op.payload } };
      queue = queue.map((q, i) => (i === idx ? merged : q));
    } else {
      queue = [...queue, { ...op, key, attempts: 0 }];
    }
  } else {
    // Exclusão: descarta upserts pendentes da mesma linha e enfileira o delete.
    queue = [...queue.filter((q) => q.key !== key), { ...op, key, attempts: 0 }];
  }
  await persist();
  emit();
}

async function sendOne(op: OutboxOp) {
  if (op.kind === 'upsert') {
    const { error } = await supabase
      .from(op.table)
      .upsert(op.payload as never, { onConflict: 'id' });
    if (error) throw error;
  } else {
    const { error } = await supabase.from(op.table).delete().eq('id', op.id);
    if (error) throw error;
  }
}

export function flushOutbox(): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    await loadOutbox();
    let sent = 0;
    const failed: OutboxOp[] = [];
    let offline = false;
    while (queue.length > 0) {
      const op = queue[0];
      try {
        await sendOne(op);
        queue = queue.slice(1);
        sent += 1;
        lastError = null;
      } catch (e) {
        if (isNetworkError(e)) {
          offline = true;
          break;
        }
        const message =
          e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
        const updated = { ...op, attempts: op.attempts + 1, lastError: message };
        lastError = message;
        if (updated.attempts >= MAX_ATTEMPTS) {
          // Erro permanente (ex.: validação): remove para não travar a fila.
          failed.push(updated);
          queue = queue.slice(1);
        } else {
          queue = [updated, ...queue.slice(1)];
          break;
        }
      }
      await persist();
      emit();
    }
    await persist();
    emit();
    return { sent, pending: queue.length, offline, failed };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Usado em testes e ao sair da conta. */
export async function clearOutbox() {
  queue = [];
  await AsyncStorage.removeItem(STORAGE_KEY);
  emit();
}
