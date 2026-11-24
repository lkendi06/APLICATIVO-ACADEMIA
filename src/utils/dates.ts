export type RangeKey = '7d' | '30d' | '3m' | '6m' | '12m' | 'custom';

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: '12m', label: '12 meses' },
  { key: 'custom', label: 'Período' },
];

export type DateRange = { from: Date; to: Date };

export function rangeFor(key: Exclude<RangeKey, 'custom'>, now = new Date()): DateRange {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  switch (key) {
    case '7d':
      from.setDate(from.getDate() - 6);
      break;
    case '30d':
      from.setDate(from.getDate() - 29);
      break;
    case '3m':
      from.setMonth(from.getMonth() - 3);
      break;
    case '6m':
      from.setMonth(from.getMonth() - 6);
      break;
    case '12m':
      from.setFullYear(from.getFullYear() - 1);
      break;
  }
  return { from, to };
}

/** Início da semana (segunda-feira, 00:00) no fuso local. */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - day);
  return d;
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Para cada dia da semana atual (seg→dom), indica se houve treino. */
export function weekActivity(dates: (string | Date)[], now = new Date()): boolean[] {
  const start = startOfWeek(now);
  const out = Array(7).fill(false) as boolean[];
  for (const raw of dates) {
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    const diff = daysBetween(start, d);
    if (diff >= 0 && diff < 7) out[diff] = true;
  }
  return out;
}
