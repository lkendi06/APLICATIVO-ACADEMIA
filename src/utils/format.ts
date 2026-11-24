const nf = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return nf(digits).format(value);
}

export function formatFixed(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function formatWeight(kg: number | null | undefined, unit: 'kg' | 'lb' = 'kg', digits = 1) {
  if (kg == null) return '—';
  return unit === 'kg'
    ? `${formatNumber(kg, digits)} kg`
    : `${formatNumber(kg / KG_PER_LB, digits)} lb`;
}

export function formatLength(cm: number | null | undefined, unit: 'cm' | 'in' = 'cm') {
  if (cm == null) return '—';
  return unit === 'cm' ? `${formatNumber(cm, 1)} cm` : `${formatNumber(cm / CM_PER_IN, 1)} in`;
}

/** Converte o valor digitado na unidade do usuário para a unidade do banco (kg/cm). */
export function toKg(value: number, unit: 'kg' | 'lb') {
  return unit === 'kg' ? value : Math.round(value * KG_PER_LB * 100) / 100;
}
export function fromKg(kg: number, unit: 'kg' | 'lb') {
  return unit === 'kg' ? kg : Math.round((kg / KG_PER_LB) * 10) / 10;
}
export function toCm(value: number, unit: 'cm' | 'in') {
  return unit === 'cm' ? value : Math.round(value * CM_PER_IN * 10) / 10;
}
export function fromCm(cm: number, unit: 'cm' | 'in') {
  return unit === 'cm' ? cm : Math.round((cm / CM_PER_IN) * 10) / 10;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds < 0) return '—';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function formatClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDate(
  iso: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(
    'pt-BR',
    opts ?? { day: '2-digit', month: 'short', year: 'numeric' },
  )
    .format(d)
    .replace('.', '');
}

export function formatDateTime(iso: string | Date | null | undefined) {
  if (!iso) return '—';
  return formatDate(iso, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLongToday(now = new Date()) {
  const s = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function firstName(fullName: string | null | undefined) {
  return (fullName ?? '').trim().split(/\s+/)[0] || 'Atleta';
}

/** Lê números digitados no padrão brasileiro ("82,5") ou internacional ("82.5"). */
export function parseDecimal(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = input.trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Máscara simples DD/MM/AAAA enquanto o usuário digita. */
export function maskBrDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
