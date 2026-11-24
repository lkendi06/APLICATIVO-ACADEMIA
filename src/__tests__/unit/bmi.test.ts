import {
  ageFromBirthDate,
  calculateBmi,
  canUseAdultClassification,
  classifyBmi,
  healthyWeightRange,
} from '@/utils/bmi';

describe('calculateBmi', () => {
  it('calcula 80 kg e 180 cm como 24,69', () => {
    expect(calculateBmi(80, 180)).toBe(24.69);
  });

  it('arredonda para duas casas', () => {
    expect(calculateBmi(70, 175)).toBe(22.86);
  });

  it.each([
    [0, 180],
    [80, 0],
    [-1, 170],
    [NaN, 170],
    [80, Infinity],
  ])('retorna null para entradas inválidas (%p, %p)', (w, h) => {
    expect(calculateBmi(w, h)).toBeNull();
  });
});

describe('classifyBmi (OMS, adultos)', () => {
  it.each([
    [17.9, 'underweight'],
    [18.5, 'normal'],
    [24.99, 'normal'],
    [25, 'overweight'],
    [29.9, 'overweight'],
    [30, 'obesity1'],
    [35, 'obesity2'],
    [40, 'obesity3'],
    [55, 'obesity3'],
  ])('IMC %p → %s', (bmi, key) => {
    expect(classifyBmi(bmi).key).toBe(key);
  });
});

describe('idade e aplicabilidade', () => {
  const now = new Date(2026, 10, 24); // 24/11/2026
  it('calcula a idade considerando o aniversário', () => {
    expect(ageFromBirthDate('2000-11-24', now)).toBe(26);
    expect(ageFromBirthDate('2000-11-25', now)).toBe(25);
    expect(ageFromBirthDate(null, now)).toBeNull();
    expect(ageFromBirthDate('invalida', now)).toBeNull();
  });

  it('não usa a classificação adulta para menores de 18', () => {
    expect(canUseAdultClassification(17)).toBe(false);
    expect(canUseAdultClassification(18)).toBe(true);
    expect(canUseAdultClassification(null)).toBe(true);
  });

  it('faixa de peso adequado para 180 cm', () => {
    expect(healthyWeightRange(180)).toEqual([59.9, 80.7]);
    expect(healthyWeightRange(0)).toBeNull();
  });
});
