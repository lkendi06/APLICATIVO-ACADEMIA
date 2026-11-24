import { useState } from 'react';

/**
 * Estado local editável que se ressincroniza quando o valor de origem muda
 * (padrão recomendado pelo React: ajustar o estado durante a renderização,
 * sem useEffect).
 */
export function useSyncedState<T>(source: T, equals: (a: T, b: T) => boolean = Object.is) {
  const [value, setValue] = useState(source);
  const [prev, setPrev] = useState(source);
  if (!equals(prev, source)) {
    setPrev(source);
    setValue(source);
  }
  return [value, setValue] as const;
}
