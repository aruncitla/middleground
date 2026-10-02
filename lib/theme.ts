import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#09090B',
  surface1: '#121216',
  surface2: '#1B1B20',
  surface3: '#232329',
  surface: '#1B1B20',
  card: '#1B1B20',
  cardSolid: '#1B1B20',
  cardAlt: '#121216',
  line: 'rgba(255,255,255,.08)',
  border: 'rgba(255,255,255,.08)',
  input: '#17171C',
  inputBorder: 'transparent',
  ink: '#FAFAF9',
  muted: '#D4D4D8',
  faint: '#A1A1AA',
  coral: '#FF6B6B',
  coralBright: '#FF8A7A',
  teal: '#2DD4BF',
  tealBright: '#5EEAD4',
  gold: '#FBBF24',
  amber: '#FBBF24',
  accent: '#2DD4BF',
  accentHover: '#5EEAD4',
  accentSoft: 'rgba(45, 212, 191, 0.35)',
  accentGlow: 'rgba(45, 212, 191, 0.16)',
  warmGlow: 'rgba(251, 191, 36, 0.2)',
  coralGlow: 'rgba(255, 107, 107, 0.22)',
  tealGlow: 'rgba(45, 212, 191, 0.22)',
  danger: '#FF6B6B',
  onTeal: '#04211C',
  onCoral: '#330F0F',
};

/** Coral and teal with a zinc middle — used only on the verdict / vote spectrum bar. */
export const spectrum = ['#FF6B6B', '#3F3F46', '#2DD4BF'] as const;

export const candy = ['#5EEAD4', '#F9A8D4', '#C4B5FD', '#FDE68A'] as const;

export const fonts = {
  light: 'Inter',
  regular: 'Inter',
  medium: 'Inter',
  semibold: 'Inter',
  bold: 'Inter',
};

export const radii = {
  card: 18,
  input: 14,
  pill: 999,
};

export const shadows = {
  card: '0 18px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)',
  primary:
    'inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(4,33,28,.18), 0 10px 24px rgba(45,212,191,.32), 0 2px 6px rgba(0,0,0,.45)',
  coral:
    'inset 0 1px 0 rgba(255,255,255,.50), inset 0 -2px 0 rgba(51,15,15,.16), 0 10px 24px rgba(255,107,107,.28), 0 2px 6px rgba(0,0,0,.45)',
  maybe: 'inset 0 1px 0 rgba(255,255,255,.08), 0 8px 18px rgba(0,0,0,.35)',
  maybeOn: '0 0 0 3px rgba(251,191,36,.18), 0 8px 18px rgba(0,0,0,.35)',
  secondary: 'inset 0 1px 0 rgba(255,255,255,.05), 0 6px 16px rgba(0,0,0,.30)',
  disabled: '0 2px 6px rgba(0,0,0,.25)',
  input: 'inset 0 1px 3px rgba(0,0,0,.45), inset 0 -1px 0 rgba(255,255,255,.03)',
  inputFocus: '0 0 0 3px rgba(45,212,191,.18), inset 0 1px 3px rgba(0,0,0,.45)',
  thought: '0 22px 48px rgba(0,0,0,.50), inset 0 1px 0 rgba(255,255,255,.05)',
} as const;

type FontWeight = NonNullable<TextStyle['fontWeight']>;
const fw = {
  light: '300' as FontWeight,
  regular: '400' as FontWeight,
  medium: '500' as FontWeight,
  semibold: '600' as FontWeight,
  bold: '700' as FontWeight,
  button: '650' as unknown as FontWeight,
};

export const type = {
  brand: {
    fontFamily: fonts.bold,
    fontWeight: fw.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  kicker: {
    fontFamily: fonts.medium,
    fontWeight: fw.medium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.faint,
  },
  hero: {
    fontFamily: fonts.bold,
    fontWeight: fw.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.35,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.semibold,
    fontWeight: fw.semibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: colors.ink,
  },
  section: {
    fontFamily: fonts.semibold,
    fontWeight: fw.semibold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.regular,
    fontWeight: fw.regular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
    color: colors.muted,
  },
  label: {
    fontFamily: fonts.medium,
    fontWeight: fw.medium,
    fontSize: 13,
    letterSpacing: 0,
    color: colors.muted,
  },
  footnote: {
    fontFamily: fonts.light,
    fontWeight: fw.light,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
    color: colors.faint,
  },
  button: {
    fontFamily: fonts.semibold,
    fontWeight: fw.button,
    fontSize: 16,
    letterSpacing: -0.16,
    color: colors.ink,
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 20,
    letterSpacing: 1.6,
    fontWeight: fw.bold,
    color: colors.ink,
  },
} satisfies Record<string, TextStyle>;

const webFocus = Platform.OS === 'web' ? ({ outlineStyle: 'none' as 'solid' } as const) : {};

export const controls = {
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.input,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: fw.regular,
    letterSpacing: 0,
    color: colors.ink,
    boxShadow: shadows.input,
    ...webFocus,
  } as TextStyle,
  panel: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    padding: 18,
    gap: 10,
    boxShadow: shadows.card,
    ...(Platform.OS === 'web' ? { backgroundImage: 'linear-gradient(180deg, #1B1B20, #121216)' } : {}),
  },
  ghostText: {
    fontFamily: fonts.medium,
    fontWeight: fw.medium,
    fontSize: 13,
    color: colors.muted,
  } satisfies TextStyle,
};

export const avatars = [
  { id: 'fox', emoji: '🦊', color: 'rgba(94, 234, 212, 0.28)' },
  { id: 'alien', emoji: '👽', color: 'rgba(196, 181, 253, 0.28)' },
  { id: 'frog', emoji: '🐸', color: 'rgba(249, 168, 212, 0.28)' },
  { id: 'fire', emoji: '🔥', color: 'rgba(253, 230, 138, 0.28)' },
  { id: 'rainbow', emoji: '🌈', color: 'rgba(94, 234, 212, 0.28)' },
  { id: 'robot', emoji: '👾', color: 'rgba(196, 181, 253, 0.28)' },
  { id: 'hat', emoji: '🎩', color: 'rgba(249, 168, 212, 0.28)' },
] as const;

export type AvatarId = (typeof avatars)[number]['id'];

export function avatarById(id: string) {
  return avatars.find((a) => a.id === id) ?? avatars[0];
}

export function candyForIndex(index: number) {
  return candy[Math.abs(index) % candy.length] ?? candy[0];
}
