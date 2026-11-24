import { z } from 'zod';

import { parseDecimal } from '@/utils/format';

/** Campo numérico opcional digitado como texto (aceita vírgula). */
const optionalNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .optional()
    .refine((v) => {
      if (v == null || v.trim() === '') return true;
      const n = parseDecimal(v);
      return n != null && n >= min && n <= max;
    }, `${label}: informe um valor entre ${min} e ${max}.`);

export const metricSchema = z
  .object({
    weight: optionalNumber(20, 400, 'Peso'),
    height: optionalNumber(50, 260, 'Altura'),
    waist: optionalNumber(20, 300, 'Abdômen'),
    arm: optionalNumber(10, 120, 'Braço'),
    chest: optionalNumber(30, 300, 'Peito'),
    hip: optionalNumber(30, 300, 'Quadril'),
    thigh: optionalNumber(15, 150, 'Coxa'),
    bodyFat: optionalNumber(2, 75, 'Gordura corporal'),
    notes: z.string().max(500, 'Máximo de 500 caracteres.').optional(),
  })
  .refine(
    (v) =>
      [v.weight, v.height, v.waist, v.arm, v.chest, v.hip, v.thigh, v.bodyFat].some(
        (x) => x != null && x.trim() !== '',
      ),
    { message: 'Preencha pelo menos uma medida.', path: ['weight'] },
  );
export type MetricFormValues = z.infer<typeof metricSchema>;

export const planSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao treino.').max(80, 'Máximo de 80 caracteres.'),
  description: z.string().max(500, 'Máximo de 500 caracteres.').optional(),
  color: z.string().nullable(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        exercise_id: z.string(),
        name: z.string(),
        primary_muscle: z.string(),
        target_sets: z.number().int().min(1).max(20),
        target_reps: z.number().int().min(1).max(100),
        target_weight_kg: z.number().min(0).max(1000).nullable(),
        rest_seconds: z.number().int().min(0).max(900),
      }),
    )
    .min(1, 'Adicione pelo menos um exercício.'),
});
export type PlanFormValues = z.infer<typeof planSchema>;

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Informe seu nome.')
    .max(120, 'Nome muito longo.'),
  birthDate: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return false;
      const [d, m, y] = v.split('/').map(Number);
      const date = new Date(y, m - 1, d);
      return (
        date.getFullYear() === y &&
        date.getMonth() === m - 1 &&
        date.getDate() === d &&
        y > 1900 &&
        date <= new Date()
      );
    }, 'Use o formato DD/MM/AAAA com uma data válida.'),
  sex: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).nullable(),
  fitnessGoal: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'endurance', 'health']).nullable(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  weeklyGoal: z.number().int().min(1).max(14),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export function brDateToIso(br: string | undefined): string | null {
  if (!br) return null;
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
}

export function isoToBrDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
