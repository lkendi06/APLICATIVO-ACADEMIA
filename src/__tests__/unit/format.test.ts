import {
  firstName,
  formatClock,
  fromKg,
  greeting,
  maskBrDate,
  parseDecimal,
  toCm,
  toKg,
} from '@/utils/format';

describe('parseDecimal', () => {
  it('aceita vírgula e ponto', () => {
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal('82.5')).toBe(82.5);
    expect(parseDecimal(' 70 ')).toBe(70);
    expect(parseDecimal(12)).toBe(12);
  });
  it('rejeita valores vazios ou inválidos', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal(NaN)).toBeNull();
  });
});

describe('conversão de unidades', () => {
  it('kg ↔ lb sem perda relevante', () => {
    // exibição com 1 casa; armazenamento com 2 casas
    expect(fromKg(100, 'lb')).toBe(220.5);
    expect(Math.abs(toKg(fromKg(80, 'lb'), 'lb') - 80)).toBeLessThan(0.05);
    expect(fromKg(80, 'kg')).toBe(80);
  });
  it('polegadas → cm', () => {
    expect(toCm(10, 'in')).toBeCloseTo(25.4, 6);
    expect(toCm(170, 'cm')).toBe(170);
  });
});

describe('textos', () => {
  it('formatClock', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(75)).toBe('01:15');
  });
  it('saudação por horário', () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe('Bom dia');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Boa tarde');
    expect(greeting(new Date(2026, 0, 1, 21))).toBe('Boa noite');
  });
  it('primeiro nome com fallback', () => {
    expect(firstName('Lucas Kendi')).toBe('Lucas');
    expect(firstName('')).toBe('Atleta');
  });
  it('máscara de data DD/MM/AAAA', () => {
    expect(maskBrDate('2')).toBe('2');
    expect(maskBrDate('2411')).toBe('24/11');
    expect(maskBrDate('24112026')).toBe('24/11/2026');
    expect(maskBrDate('24/11/2026999')).toBe('24/11/2026');
  });
});
