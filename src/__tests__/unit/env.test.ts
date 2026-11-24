import { normalizeSupabaseUrl } from '@/lib/env';

describe('normalizeSupabaseUrl', () => {
  const base = 'https://abc.supabase.co';
  it.each([
    [base, base],
    [`${base}/`, base],
    [`${base}/rest/v1`, base],
    [`${base}/rest/v1/`, base],
    [`${base}/auth/v1`, base],
    [`  ${base}  `, base],
    [`"${base}"`, base],
  ])('%p → %p', (input, out) => {
    expect(normalizeSupabaseUrl(input)).toBe(out);
  });
  it('vazio continua vazio', () => expect(normalizeSupabaseUrl(undefined)).toBe(''));
});
