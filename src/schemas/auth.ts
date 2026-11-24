import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .email('E-mail inválido.');

export const passwordRules = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')
  .regex(/[a-z]/, 'Inclua pelo menos uma letra minúscula.')
  .regex(/[A-Z]/, 'Inclua pelo menos uma letra maiúscula.')
  .regex(/[0-9]/, 'Inclua pelo menos um número.');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
  remember: z.boolean(),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Informe seu nome completo.')
      .max(120, 'Nome muito longo.')
      .refine((v) => v.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),
    email,
    password: passwordRules,
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
    acceptTerms: z.boolean().refine((v) => v, 'Você precisa aceitar os termos para continuar.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: passwordRules, confirmPassword: z.string().min(1, 'Confirme sua senha.') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  });
export type ResetValues = z.infer<typeof resetSchema>;

/** Força da senha de 0 a 4 (feedback visual no cadastro). */
export function passwordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score;
}
