/**
 * Design tokens do FitTrack.
 * Identidade: fundo grafite profundo, acento verde-limão energético e
 * tipografia Inter com hierarquia forte.
 */

export const palette = {
  lime: '#C6F432',
  limeDeep: '#4D7C0F',
  violet: '#8B7CFF',
  sky: '#38BDF8',
  emerald: '#34D399',
  amber: '#FBBF24',
  coral: '#F87171',
  ink: '#0B0D10',
  white: '#FFFFFF',
} as const;

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  info: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  chart: readonly string[];
  tabBar: string;
  skeleton: string;
};

export const darkColors: ColorTokens = {
  background: '#0B0D10',
  surface: '#14171C',
  surfaceAlt: '#1B1F26',
  surfaceRaised: '#20252D',
  border: '#232831',
  borderStrong: '#323944',
  text: '#F2F4F7',
  textMuted: '#A0A8B4',
  textSubtle: '#6B7380',
  primary: palette.lime,
  primaryPressed: '#B2DE22',
  onPrimary: palette.ink,
  primaryText: palette.lime,
  primarySoft: 'rgba(198, 244, 50, 0.12)',
  accent: palette.violet,
  accentSoft: 'rgba(139, 124, 255, 0.14)',
  info: palette.sky,
  success: palette.emerald,
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: palette.amber,
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: palette.coral,
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  chart: [palette.lime, palette.violet, palette.sky, palette.amber, palette.coral],
  tabBar: '#101318',
  skeleton: '#1E232A',
};

export const lightColors: ColorTokens = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  surfaceRaised: '#FFFFFF',
  border: '#E3E6EB',
  borderStrong: '#CDD2DA',
  text: '#0B0D10',
  textMuted: '#4B5563',
  textSubtle: '#8A93A0',
  primary: '#B9EA1F',
  primaryPressed: '#A5D514',
  onPrimary: palette.ink,
  primaryText: palette.limeDeep,
  primarySoft: 'rgba(77, 124, 15, 0.10)',
  accent: '#6D5CF0',
  accentSoft: 'rgba(109, 92, 240, 0.10)',
  info: '#0284C7',
  success: '#059669',
  successSoft: 'rgba(5, 150, 105, 0.10)',
  warning: '#B45309',
  warningSoft: 'rgba(180, 83, 9, 0.10)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  overlay: 'rgba(11, 13, 16, 0.45)',
  chart: [palette.limeDeep, '#6D5CF0', '#0284C7', '#B45309', '#DC2626'],
  tabBar: '#FFFFFF',
  skeleton: '#E6E9EE',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  number: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export const motion = {
  fast: 150,
  base: 220,
  slow: 360,
} as const;
