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
  /**
   * Secondary text. Six points darker than it started: at #5F7370 it measured
   * 4.34:1 on porcelain while carrying every lede and meta line in the app —
   * just under the 4.5 WCAG asks of body copy. contrast.test.ts holds it above
   * the line now, on porcelain and on tile.
   */
  slate: '#596D6A',
  /**
   * Marks, not words: ticks, hairlines, a chevron, a disabled label. It sits
   * under 2.2:1 on porcelain and on tile, so copy that used to wear it wears
   * slate instead. On ink it measures 6.2:1, which is where the tab count
   * legitimately uses it.
   */
  mute: '#9BABA8',
  /**
   * Placeholder text, and nothing else. The lightest tone that still clears
   * 4.5:1 on tile and on the search field's green wash — the wash is the
   * darker, so it set this, four points darker than the #657A77 that tile
   * alone allowed. Still deliberately lighter than slate, because a
   * placeholder that matches the secondary text makes an empty field look
   * like a filled one. Both halves of that are pinned in contrast.test.ts.
   */
  placeholder: '#617572',
  /** Hairlines and dividers. */
  edge: '#D6DEDC',
  /**
   * The recipe screen's backdrop. Bright enough that everything on it has to
   * be dark: pale text measures 2.2:1 here and white 2.5:1, while ink reads
   * at 5.6:1. That is why the bar on that screen is inked rather than pale,
   * and why the saved bookmark fills instead of turning yolk — yolk on this
   * green is 1.3:1, which is no mark at all.
   */
  kelly: '#4CBB17',
  /**
   * Kelly at field-fill strength: 8% of it over white. The search field wears
   * it in place of a border, as faint against porcelain as a pale-green field
   * is against a white page — the magnifier and placeholder do the telling.
   */
  kellyWash: '#F1FAEC',
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

/**
 * The keep-for-later control, as it is drawn in each state. Both states are
 * checked against WCAG in contrast.test.ts: a bare mark on the page measured
 * 2:1 off and 1.6:1 on — the accent was *less* visible than the resting
 * state, so turning it on read as nothing happening. Filling the pill is the
 * same on/off language the category picker already uses.
 */
export const SAVE_COLORS = {
  off: { pill: color.tile, border: color.edge, mark: color.slate },
  on: { pill: color.ink, border: color.ink, mark: color.yolk },
} as const;

/**
 * The glazes a mark wears when a meal has no photo, one picked from the meal's
 * name. Deep ceramic colours rather than bright ones: they have to carry a
 * porcelain letter, and they sit next to each other down a list. Every one is
 * checked in contrast.test.ts — the letter against the glaze, and the yolk band
 * of today's meal against it too.
 *
 * One per hue around the wheel — red, orange, yellow-green, cyan, blue, magenta
 * — so two glazes next to each other in a list never read as the same colour.
 *
 * Ink is deliberately NOT among them. It was, and that made one mark in six
 * identical to how marks looked before there were glazes at all, which is
 * indistinguishable from the feature not working.
 *
 * Order is part of the contract. glazeFor indexes into this array, so inserting
 * or reordering recolours meals people have had for months.
 */
export const GLAZES = [
  /** Oxblood — red. */
  '#6B1F22',
  /** Sienna — orange. */
  '#6B2D1E',
  /** Olive — yellow-green. */
  '#2E3A18',
  /** Deep teal — cyan. */
  '#0E3B3E',
  /** Indigo — blue. */
  '#22305C',
  /** Plum — magenta. */
  '#4A1E35',
] as const;

/**
 * The segmented picker, as each pill is drawn. Yolk is deliberately absent:
 * the accent means "this is what you're eating today" everywhere else in the
 * app, and spending it on "this is the list you're looking at" would blunt it.
 * The filled pill carries the selection instead. Both states are checked as
 * text contrast in contrast.test.ts — the count is the smallest type here, so
 * it sets the floor, not the label.
 */
export const TAB_COLORS = {
  off: { pill: color.tile, label: color.slate, count: color.slate },
  on: { pill: color.ink, label: color.tile, count: color.mute },
} as const;
