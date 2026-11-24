import { useMemo } from 'react';

import type { BodyMetric } from '@/types/database';
import {
  ageFromBirthDate,
  calculateBmi,
  canUseAdultClassification,
  classifyBmi,
} from '@/utils/bmi';

/** Valores mais recentes de cada medida (cada registro pode ter só algumas). */
export function latestValues(metrics: BodyMetric[]) {
  const sorted = [...metrics].sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at));
  const pick = <K extends keyof BodyMetric>(k: K) => sorted.find((m) => m[k] != null) ?? null;
  return {
    weight: pick('weight_kg'),
    height: pick('height_cm'),
    waist: pick('waist_cm'),
    arm: pick('arm_cm'),
    chest: pick('chest_cm'),
    hip: pick('hip_cm'),
    thigh: pick('thigh_cm'),
    bodyFat: pick('body_fat_pct'),
  };
}

/** Série histórica de IMC: usa a altura mais recente conhecida até cada data. */
export function bmiSeries(metrics: BodyMetric[]) {
  const asc = [...metrics].sort((a, b) => Date.parse(a.measured_at) - Date.parse(b.measured_at));
  let height: number | null = null;
  const out: { date: Date; bmi: number; metric: BodyMetric }[] = [];
  for (const m of asc) {
    if (m.height_cm != null) height = m.height_cm;
    if (m.weight_kg != null && height != null) {
      const bmi = calculateBmi(m.weight_kg, height);
      if (bmi != null) out.push({ date: new Date(m.measured_at), bmi, metric: m });
    }
  }
  // Pesos registrados antes da primeira altura usam a primeira altura informada.
  const firstHeight = asc.find((m) => m.height_cm != null)?.height_cm;
  if (firstHeight) {
    for (const m of asc) {
      if (m.height_cm != null) break;
      if (m.weight_kg != null) {
        const bmi = calculateBmi(m.weight_kg, firstHeight);
        if (bmi != null) out.unshift({ date: new Date(m.measured_at), bmi, metric: m });
      }
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function useBodyStats(
  metrics: BodyMetric[] | undefined,
  birthDate: string | null | undefined,
) {
  return useMemo(() => {
    const list = metrics ?? [];
    const latest = latestValues(list);
    const weight = latest.weight?.weight_kg ?? null;
    const height = latest.height?.height_cm ?? null;
    const bmi = weight != null && height != null ? calculateBmi(weight, height) : null;
    const age = ageFromBirthDate(birthDate);
    const adult = canUseAdultClassification(age);
    const category = bmi != null && adult ? classifyBmi(bmi) : null;
    const lastUpdate = [latest.weight, latest.height]
      .filter(Boolean)
      .map((m) => m!.measured_at)
      .sort()
      .pop();
    return {
      latest,
      weight,
      height,
      bmi,
      age,
      adult,
      category,
      lastUpdate,
      series: bmiSeries(list),
    };
  }, [metrics, birthDate]);
}
