import { startOfWeek, rangeFor, weekActivity } from '@/utils/dates';
import { goalProgress } from '@/utils/goals';
import { computeTotals, elapsedSeconds, estimateOneRepMax, percentChange } from '@/utils/workout';

describe('computeTotals', () => {
  it('conta só séries concluídas e soma o volume', () => {
    const t = computeTotals([
      { reps: 10, weight_kg: 40, completed: true },
      { reps: 8, weight_kg: 45, completed: true },
      { reps: 6, weight_kg: 50, completed: false },
    ]);
    expect(t).toEqual({ completedSets: 2, totalReps: 18, volumeKg: 760 });
  });
  it('lista vazia', () => {
    expect(computeTotals([])).toEqual({ completedSets: 0, totalReps: 0, volumeKg: 0 });
  });
});

describe('estimateOneRepMax (Epley)', () => {
  it('100 kg × 10 ≈ 133,3 kg', () => expect(estimateOneRepMax(100, 10)).toBe(133.3));
  it('1 repetição = a própria carga', () => expect(estimateOneRepMax(120, 1)).toBe(120));
  it('valores inválidos = 0', () => expect(estimateOneRepMax(0, 10)).toBe(0));
});

describe('percentChange', () => {
  it('calcula e evita divisão por zero', () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe('elapsedSeconds', () => {
  const started = '2026-11-24T10:00:00.000Z';
  it('desconta pausas', () => {
    const now = Date.parse('2026-11-24T10:30:00.000Z');
    expect(
      elapsedSeconds({ started_at: started, paused_at: null, total_paused_seconds: 300 }, now),
    ).toBe(1500);
  });
  it('congela enquanto pausado', () => {
    const now = Date.parse('2026-11-24T11:00:00.000Z');
    expect(
      elapsedSeconds(
        { started_at: started, paused_at: '2026-11-24T10:10:00.000Z', total_paused_seconds: 0 },
        now,
      ),
    ).toBe(600);
  });
});

describe('datas', () => {
  it('a semana começa na segunda-feira', () => {
    const wed = new Date(2026, 10, 25, 15); // quarta, 25/11/2026
    const s = startOfWeek(wed);
    expect(s.getDay()).toBe(1);
    expect(s.getDate()).toBe(23);
    expect(s.getHours()).toBe(0);
  });
  it('domingo pertence à semana iniciada na segunda anterior', () => {
    const sun = new Date(2026, 10, 29, 10);
    expect(startOfWeek(sun).getDate()).toBe(23);
  });
  it('rangeFor 7d inclui hoje e os 6 dias anteriores', () => {
    const now = new Date(2026, 10, 24, 12);
    const { from, to } = rangeFor('7d', now);
    expect(from.getDate()).toBe(18);
    expect(to.getDate()).toBe(24);
  });
  it('weekActivity marca os dias treinados', () => {
    const now = new Date(2026, 10, 25, 12);
    const act = weekActivity([new Date(2026, 10, 23, 9), new Date(2026, 10, 25, 7)], now);
    expect(act).toEqual([true, false, true, false, false, false, false]);
  });
});

describe('goalProgress', () => {
  it('perder peso: 90 → 80, atual 85 = 50%', () => {
    const p = goalProgress({ type: 'target_weight', start_value: 90, target_value: 80 }, 85);
    expect(p.ratio).toBeCloseTo(0.5);
    expect(p.reached).toBe(false);
  });
  it('ganhar peso também funciona', () => {
    const p = goalProgress({ type: 'target_weight', start_value: 60, target_value: 70 }, 71);
    expect(p.ratio).toBe(1);
    expect(p.reached).toBe(true);
  });
  it('treinos semanais', () => {
    const p = goalProgress({ type: 'weekly_workouts', start_value: null, target_value: 4 }, 3);
    expect(p.ratio).toBeCloseTo(0.75);
  });
  it('carga em exercício com ponto de partida', () => {
    const p = goalProgress({ type: 'exercise_load', start_value: 60, target_value: 100 }, 80);
    expect(p.ratio).toBeCloseTo(0.5);
  });
  it('sem dados: sem progresso', () => {
    expect(goalProgress({ type: 'body_fat', start_value: 20, target_value: 15 }, null)).toEqual({
      current: null,
      ratio: null,
      reached: false,
    });
  });
});
