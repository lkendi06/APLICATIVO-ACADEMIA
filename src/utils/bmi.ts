/**
 * Índice de Massa Corporal: IMC = peso (kg) / altura² (m).
 * Classificação de referência da OMS para ADULTOS (18 anos ou mais).
 */

export type BmiCategory =
  'underweight' | 'normal' | 'overweight' | 'obesity1' | 'obesity2' | 'obesity3';

export const BMI_CATEGORIES: {
  key: BmiCategory;
  label: string;
  min: number;
  max: number;
  tone: 'info' | 'success' | 'warning' | 'danger';
}[] = [
  { key: 'underweight', label: 'Abaixo do peso', min: 0, max: 18.5, tone: 'info' },
  { key: 'normal', label: 'Peso adequado', min: 18.5, max: 25, tone: 'success' },
  { key: 'overweight', label: 'Sobrepeso', min: 25, max: 30, tone: 'warning' },
  { key: 'obesity1', label: 'Obesidade grau I', min: 30, max: 35, tone: 'danger' },
  { key: 'obesity2', label: 'Obesidade grau II', min: 35, max: 40, tone: 'danger' },
  { key: 'obesity3', label: 'Obesidade grau III', min: 40, max: Infinity, tone: 'danger' },
];

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 100) / 100;
}

export function classifyBmi(bmi: number) {
  return BMI_CATEGORIES.find((c) => bmi >= c.min && bmi < c.max) ?? BMI_CATEGORIES[0];
}

export function ageFromBirthDate(
  birthDate: string | null | undefined,
  now = new Date(),
): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = now.getFullYear() - y;
  const beforeBirthday = now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** A classificação adulta só vale para 18+ anos. Idade desconhecida: mostramos com aviso. */
export function canUseAdultClassification(age: number | null): boolean {
  return age == null || age >= 18;
}

/** Faixa de peso associada ao IMC adequado (18,5–24,9) para a altura informada. */
export function healthyWeightRange(heightCm: number): [number, number] | null {
  if (!heightCm || heightCm <= 0) return null;
  const m2 = (heightCm / 100) ** 2;
  return [Math.round(18.5 * m2 * 10) / 10, Math.round(24.9 * m2 * 10) / 10];
}
