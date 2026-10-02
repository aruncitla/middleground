import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#09090B',
  surface: 'rgba(24, 24, 27, 0.62)',
  card: 'rgba(24, 24, 27, 0.62)',
  cardSolid: '#18181B',
  cardAlt: '#1c1c20',
  border: 'rgba(39, 39, 42, 0.85)',
  input: 'rgba(39, 39, 42, 0.5)',
  inputBorder: 'rgba(63, 63, 70, 0.6)',
  ink: '#ffffff',
  muted: '#D4D4D8',
  faint: '#A1A1AA',
  coral: '#FF6B6B',
  teal: '#2DD4BF',
  gold: '#E8B84A',
  amber: '#E8B84A',
  accent: '#2DD4BF',
  accentHover: '#5EEAD4',
  accentSoft: 'rgba(45, 212, 191, 0.35)',
  accentGlow: 'rgba(45, 212, 191, 0.16)',
  warmGlow: 'rgba(232, 184, 74, 0.2)',
  coralGlow: 'rgba(255, 107, 107, 0.22)',
  tealGlow: 'rgba(45, 212, 191, 0.22)',
  danger: '#FF6B6B',
  onTeal: '#042F2E',
};

/** Coral and teal with a dark middle — never orange mixed into teal. */
export const spectrum = ['#FF6B6B', '#27272A', '#2DD4BF'] as const;

export const candy = ['#5EEAD4', '#F9A8D4', '#C4B5FD', '#FDE68A'] as const;

export const fonts = {
  light: 'Inter',
  regular: 'Inter',
  medium: 'Inter',
  semibold: 'Inter',
  bold: 'Inter',
};

export const type = {
  brand: {
    fontFamily: fonts.semibold,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: -0.45,
    color: colors.ink,
  },
  kicker: {
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.muted,
  },
  hero: {
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.35,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.semibold,
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: colors.ink,
  },
  section: {
    fontFamily: fonts.semibold,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.regular,
    fontWeight: '400',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
    color: colors.muted,
  },
  label: {
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 13,
    letterSpacing: 0,
    color: colors.muted,
  },
  footnote: {
    fontFamily: fonts.light,
    fontWeight: '300',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
    color: colors.muted,
  },
  button: {
    fontFamily: fonts.semibold,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.ink,
  },
} satisfies Record<string, TextStyle>;

const webFocus = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as const) : {};

export const controls = {
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    fontWeight: '400',
    letterSpacing: 0,
    color: colors.ink,
    ...webFocus,
  },
  primary: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center' as const,
    boxShadow: '0 10px 28px rgba(45, 212, 191, 0.28)',
  },
  primaryText: {
    ...type.button,
    color: colors.onTeal,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  secondaryText: {
    ...type.button,
    color: colors.ink,
  },
  ghostText: {
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 13,
    color: colors.muted,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    backdropFilter: 'blur(24px)',
  },
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
