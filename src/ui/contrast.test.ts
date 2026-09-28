import { color, GLAZES, SAVE_COLORS, TAB_COLORS } from './theme';
import { contrastRatio } from './contrast';

/** WCAG 1.4.11: a control that isn't text still has to be seen. */
const MIN_UI = 3;

/** WCAG 1.4.3 for body-sized text, which is what a tab label is. */
const MIN_TEXT = 4.5;

describe('contrastRatio', () => {
  it('matches the known extremes', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('ignores the leading hash', () => {
    expect(contrastRatio('000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
});

describe('the save control is legible in both states', () => {
  for (const state of ['off', 'on'] as const) {
    it(`${state}: the bookmark stands off its pill`, () => {
      const { pill, mark } = SAVE_COLORS[state];
      expect(contrastRatio(mark, pill)).toBeGreaterThanOrEqual(MIN_UI);
    });
  }

  // The bug this guards: a bare yolk mark on the page sat at 1.6:1, so
  // switching the control on looked like nothing had happened.
  it('the on state is unmistakable against the page', () => {
    expect(contrastRatio(SAVE_COLORS.on.pill, color.porcelain)).toBeGreaterThanOrEqual(
      MIN_UI,
    );
  });

  // Resting, it is a card like every other card — deliberately quiet, and the
  // mark inside is what identifies it.
  it('the off state rests on the app’s ordinary card surface', () => {
    expect(SAVE_COLORS.off.pill).toBe(color.tile);
    expect(SAVE_COLORS.off.border).toBe(color.edge);
  });
});

describe('the body-text tokens clear WCAG on both grounds', () => {
  for (const [name, ground] of [
    ['porcelain', color.porcelain],
    ['tile', color.tile],
  ] as const) {
    it(`slate carries copy on ${name}`, () => {
      expect(contrastRatio(color.slate, ground)).toBeGreaterThanOrEqual(MIN_TEXT);
    });
  }

  // Mute is a marking colour — ticks, hairlines, the chevron, a disabled
  // label. It has never cleared text contrast on either ground, which is why
  // the copy that used to wear it wears slate instead. Asserted rather than
  // commented so nobody reaches for it as a quiet grey again.
  it('mute is not a text colour on either ground', () => {
    expect(contrastRatio(color.mute, color.porcelain)).toBeLessThan(MIN_TEXT);
    expect(contrastRatio(color.mute, color.tile)).toBeLessThan(MIN_TEXT);
  });
});

describe('every glaze carries what is drawn on it', () => {
  for (const glaze of GLAZES) {
    it(`${glaze}: the initial reads against it`, () => {
      expect(contrastRatio(color.porcelain, glaze)).toBeGreaterThanOrEqual(MIN_TEXT);
    });

    // Today's meal wears a yolk band across the foot of its mark, and that has
    // to be seen on any glaze, not just on the petrol one it was drawn against.
    it(`${glaze}: the yolk band stands off it`, () => {
      expect(contrastRatio(color.yolk, glaze)).toBeGreaterThanOrEqual(MIN_UI);
    });
  }

  // They are told apart by hue, not lightness, so the letter is what carries
  // identity — the colour is recognition, never the only signal.
  it('are all dark enough to be a ground for pale text', () => {
    for (const glaze of GLAZES) {
      expect(contrastRatio(glaze, color.tile)).toBeGreaterThanOrEqual(MIN_TEXT);
    }
  });
});

describe('the placeholder tone', () => {
  // All five placeholders in the app sit on tile.
  it('clears WCAG for body text on tile', () => {
    expect(contrastRatio(color.placeholder, color.tile)).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  // The whole reason it is not just slate: a placeholder has to stay lighter
  // than real secondary text, or an empty field reads as a filled one. These
  // two pull in opposite directions, so both are pinned.
  it('stays lighter than the secondary text it must not imitate', () => {
    expect(contrastRatio(color.placeholder, color.tile)).toBeLessThan(
      contrastRatio(color.slate, color.tile),
    );
  });
});

describe('the segmented picker is legible in both states', () => {
  for (const state of ['off', 'on'] as const) {
    const { pill, label, count } = TAB_COLORS[state];

    it(`${state}: the label reads against its pill`, () => {
      expect(contrastRatio(label, pill)).toBeGreaterThanOrEqual(MIN_TEXT);
    });

    // The count is 11pt mono — the smallest type on the screen, and the first
    // thing that goes muddy if a tone is picked by eye.
    it(`${state}: the count reads against its pill`, () => {
      expect(contrastRatio(count, pill)).toBeGreaterThanOrEqual(MIN_TEXT);
    });
  }

  // Which tab you are on has to be obvious at a glance, not on inspection:
  // the selected pill is the only thing saying so.
  it('the selected pill separates from the unselected ones', () => {
    expect(contrastRatio(TAB_COLORS.on.pill, TAB_COLORS.off.pill)).toBeGreaterThanOrEqual(
      MIN_UI,
    );
  });
});
