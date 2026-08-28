/**
 * Design tokens.
 *
 * Direction: glazed kitchen tile. A cool porcelain ground and deep petrol ink
 * rather than the warm cream a recipe app reaches for by default — this gets
 * read in a bright kitchen at 7am, so it wants to look awake, not rustic.
 * One hot accent (yolk) marks the meal being served today, and nothing else.
 */

export const color = {
  /** Page ground — cool, faintly green-grey, like glazed ceramic. */
  porcelain: '#EBEFEE',
  /** Card surface. */
  tile: '#FFFFFF',
  /** Primary text: deep petrol, almost black but never neutral. */
  ink: '#16302E',
  /** Secondary text. */
  slate: '#5F7370',
  /** Tertiary text and inactive marks. */
  mute: '#9BABA8',
  /** Hairlines and dividers. */
  edge: '#D6DEDC',
  /** The single accent: today's pick. */
  yolk: '#F2B307',
  /** Yolk at card-fill strength. */
  yolkWash: '#FDF3D8',
  /** Destructive actions only. */
  chili: '#C4442C',
} as const;

export const font = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'Archivo_400Regular',
  bodyMedium: 'Archivo_500Medium',
  bodyBold: 'Archivo_600SemiBold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

/** 4pt base. Keeps vertical rhythm honest across screens. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

/** Mono labels are always uppercase and tracked out — the kitchen-ticket voice. */
export const eyebrow = {
  fontFamily: font.monoMedium,
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  color: color.slate,
};
