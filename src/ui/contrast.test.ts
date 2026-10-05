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
    expect(contrastRatio(SAVE_COLORS.on.pill, color.page)).toBeGreaterThanOrEqual(
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
    ['the page', color.page],
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
    expect(contrastRatio(color.mute, color.page)).toBeLessThan(MIN_TEXT);
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

describe('the recipe screen backdrop', () => {
  // It is bright, so everything drawn on it is ink. Pale text measures 2.2:1
  // here, which is why the bar on that screen is not pale.
  it('carries the ink its bar is drawn in', () => {
    expect(contrastRatio(color.ink, color.kelly)).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  it('will not carry pale text, which is why nothing pale is put on it', () => {
    expect(contrastRatio(color.porcelain, color.kelly)).toBeLessThan(MIN_TEXT);
  });

  // The saved bookmark fills its pill instead of turning yolk. Asserted so
  // nobody restores the accent here and gets a mark that cannot be seen.
  it('cannot show a yolk mark, so the saved pill fills instead', () => {
    expect(contrastRatio(color.yolk, color.kelly)).toBeLessThan(MIN_UI);
    expect(contrastRatio(color.porcelain, color.ink)).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  // The sheet rides over it, and the sheet is the page. These two are close-ish
  // in lightness (2.5:1) and told apart mostly by hue — a bright green against
  // white — which is why this asserts they differ at all rather than asserting
  // a UI threshold that only applies to controls.
  it('is not the same surface as the sheet', () => {
    expect(color.kelly).not.toBe(color.page);
    expect(contrastRatio(color.kelly, color.page)).toBeGreaterThan(1.5);
  });
});

describe('the search field', () => {
  // Typed text and the magnifier both sit on the wash.
  it('carries what is typed into it', () => {
    expect(contrastRatio(color.ink, color.kellyWash)).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  it('shows its magnifier', () => {
    expect(contrastRatio(color.slate, color.kellyWash)).toBeGreaterThanOrEqual(MIN_UI);
  });

  // It has no border, so the tint is the only thing marking where the field
  // is — as faint against the white page as the reference's field is against
  // its own. The magnifier and placeholder are what say "type here".
  it('is told apart from the page by its tint', () => {
    expect(color.kellyWash).not.toBe(color.page);
    expect(contrastRatio(color.kellyWash, color.page)).toBeGreaterThan(1.05);
  });
});

describe('the placeholder tone', () => {
  // The four on the edit form sit on tile; the search field's sits on the
  // green wash, which is the darker of the two and so the one that binds.
  for (const [name, ground] of [
    ['tile', color.tile],
    ['the search field', color.kellyWash],
  ] as const) {
    it(`clears WCAG for body text on ${name}`, () => {
      expect(contrastRatio(color.placeholder, ground)).toBeGreaterThanOrEqual(MIN_TEXT);
    });
  }

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
