import type { Exercise } from '@/types/database';

/**
 * Ponte simples entre a tela que pede um exercício (plano ou treino em andamento)
 * e a biblioteca de exercícios aberta em modo de seleção.
 */
type Handler = (exercises: Exercise[]) => void;

let handler: Handler | null = null;
let multi = true;

export const exercisePicker = {
  open(onSelect: Handler, opts?: { multiple?: boolean }) {
    handler = onSelect;
    multi = opts?.multiple ?? true;
  },
  isActive() {
    return handler !== null;
  },
  isMultiple() {
    return multi;
  },
  submit(exercises: Exercise[]) {
    const h = handler;
    handler = null;
    h?.(exercises);
  },
  cancel() {
    handler = null;
  },
};
