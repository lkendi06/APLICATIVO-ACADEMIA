import { useEffect, useState, useSyncExternalStore } from 'react';

import { activeWorkout } from '@/services/activeWorkout';
import { getOutboxSnapshot, subscribeOutbox } from '@/services/offline/outbox';

export function useActiveWorkout() {
  return useSyncExternalStore(activeWorkout.subscribe, activeWorkout.get, activeWorkout.get);
}

/** Quantidade de alterações aguardando envio ao servidor. */
export function usePendingSync() {
  const queue = useSyncExternalStore(subscribeOutbox, getOutboxSnapshot, getOutboxSnapshot);
  return queue.length;
}

/** Relógio que atualiza a cada `intervalMs` (cronômetros). */
export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
