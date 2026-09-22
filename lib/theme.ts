import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#09090b',
  surface: 'rgba(24, 24, 27, 0.62)',
  card: '#18181b',
  cardAlt: '#1c1c20',
  border: 'rgba(39, 39, 42, 0.85)',
  input: 'rgba(39, 39, 42, 0.5)',
  inputBorder: 'rgba(63, 63, 70, 0.6)',
  ink: '#ffffff',
  muted: '#a1a1aa',
  faint: '#52525b',
  accent: '#4f46e5',
  accentHover: '#6366f1',
  accentSoft: 'rgba(99, 102, 241, 0.45)',
  accentGlow: 'rgba(99, 102, 241, 0.12)',
  warmGlow: 'rgba(251, 191, 36, 0.06)',
  danger: '#ef4444',
};

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
    color: colors.faint,
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
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center' as const,
    boxShadow: '0 10px 28px rgba(99, 102, 241, 0.18)',
  },
  primaryText: {
    ...type.button,
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
  { id: 'fox', emoji: '🦊', color: '#3f3f46' },
  { id: 'alien', emoji: '👽', color: '#27272a' },
  { id: 'frog', emoji: '🐸', color: '#365314' },
  { id: 'fire', emoji: '🔥', color: '#431407' },
  { id: 'rainbow', emoji: '🌈', color: '#312e81' },
  { id: 'robot', emoji: '👾', color: '#1e293b' },
  { id: 'hat', emoji: '🎩', color: '#1c1917' },
] as const;

export type AvatarId = (typeof avatars)[number]['id'];

export function avatarById(id: string) {
  return avatars.find((a) => a.id === id) ?? avatars[0];
}
