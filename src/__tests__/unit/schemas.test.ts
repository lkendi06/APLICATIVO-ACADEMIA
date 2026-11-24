import { changePasswordSchema, passwordStrength, signInSchema, signUpSchema } from '@/schemas/auth';
import { brDateToIso, isoToBrDate, metricSchema, profileSchema } from '@/schemas/forms';

const validSignUp = {
  fullName: 'Lucas Kendi',
  email: 'lucas@example.com',
  password: 'Senha123',
  confirmPassword: 'Senha123',
  acceptTerms: true,
};

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.message);

describe('signUpSchema', () => {
  it('aceita um cadastro válido', () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });
  it('exige nome e sobrenome', () => {
    expect(messages(signUpSchema.safeParse({ ...validSignUp, fullName: 'Lucas' }))).toContain(
      'Informe nome e sobrenome.',
    );
  });
  it('valida e-mail', () => {
    expect(messages(signUpSchema.safeParse({ ...validSignUp, email: 'x@' }))).toContain(
      'E-mail inválido.',
    );
  });
  it('exige senha forte', () => {
    const r = signUpSchema.safeParse({ ...validSignUp, password: 'abc', confirmPassword: 'abc' });
    expect(messages(r)).toContain('A senha precisa ter pelo menos 8 caracteres.');
  });
  it('confirmação precisa coincidir', () => {
    expect(
      messages(signUpSchema.safeParse({ ...validSignUp, confirmPassword: 'Senha124' })),
    ).toContain('As senhas não coincidem.');
  });
  it('exige aceite dos termos', () => {
    expect(messages(signUpSchema.safeParse({ ...validSignUp, acceptTerms: false }))).toContain(
      'Você precisa aceitar os termos para continuar.',
    );
  });
});

describe('signInSchema', () => {
  it('normaliza espaços do e-mail', () => {
    const r = signInSchema.parse({ email: '  a@b.com ', password: 'x', remember: true });
    expect(r.email).toBe('a@b.com');
  });
});

describe('changePasswordSchema', () => {
  it('nova senha deve ser diferente da atual', () => {
    const r = changePasswordSchema.safeParse({
      current: 'Senha123',
      password: 'Senha123',
      confirmPassword: 'Senha123',
    });
    expect(messages(r)).toContain('A nova senha deve ser diferente da atual.');
  });
});

describe('passwordStrength', () => {
  it('cresce com a complexidade', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('Senha123!')).toBeGreaterThan(passwordStrength('senha'));
  });
});

describe('metricSchema', () => {
  it('exige pelo menos uma medida', () => {
    expect(messages(metricSchema.safeParse({}))).toContain('Preencha pelo menos uma medida.');
  });
  it('aceita só o peso, com vírgula', () => {
    expect(metricSchema.safeParse({ weight: '82,5' }).success).toBe(true);
  });
  it('rejeita valores fora do intervalo', () => {
    expect(metricSchema.safeParse({ weight: '1000' }).success).toBe(false);
  });
});

describe('profileSchema e datas', () => {
  const base = {
    fullName: 'Ana',
    sex: null,
    fitnessGoal: null,
    experienceLevel: null,
    weeklyGoal: 3,
  };
  it('valida data de nascimento', () => {
    expect(profileSchema.safeParse({ ...base, birthDate: '31/02/2000' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, birthDate: '29/02/2000' }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, birthDate: '01/01/2999' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, birthDate: '' }).success).toBe(true);
  });
  it('converte DD/MM/AAAA ↔ ISO', () => {
    expect(brDateToIso('24/11/2026')).toBe('2026-11-24');
    expect(isoToBrDate('2026-11-24')).toBe('24/11/2026');
    expect(isoToBrDate(null)).toBe('');
  });
});
