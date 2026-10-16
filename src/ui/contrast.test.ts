import { CHIP_COLORS, color, GLAZES, SAVE_COLORS, TAB_COLORS } from './theme';
import { contrastRatio } from './contrast';

/** WCAG 1.4.11: a control that isn't text still has to be seen. */
const MIN_UI = 3;

/** WCAG 1.4.3 for body-sized text, which is what a tab label is. */
const MIN_TEXT = 4.5;

/** WCAG 1.4.3 for large text — 18pt, or 14pt bold — like a screen's title. */
const MIN_LARGE_TEXT = 3;

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

describe('leaf, the one green', () => {
  // The reference's own green, and the only one in the app. White on it is
  // every button's glyph and label, as the reference draws them: 3.4:1, enough
  // for a control, short of the 4.5 small text asks. Asserted both ways so it
  // stays a known trade, not a pass.
  it('carries white at control strength', () => {
    expect(contrastRatio(color.page, color.leaf)).toBeGreaterThanOrEqual(MIN_UI);
    expect(contrastRatio(color.page, color.leaf)).toBeLessThan(MIN_TEXT);
  });

  // The add sheet's SUGGESTED tag is 10pt mono, the smallest type on the
  // green, so it wears ink — the strongest thing the green carries.
  it('carries ink more strongly than white, for its smallest type', () => {
    expect(contrastRatio(color.ink, color.leaf)).toBeGreaterThan(
      contrastRatio(color.page, color.leaf),
    );
  });

  // Green type on white — every screen's title, the list name under a meal's
  // name, the step numbers — is this same green, not a darker one kept for
  // text: 3.4:1, which a large title clears and small text does not.
  it('reads as a large title on the page', () => {
    expect(contrastRatio(color.leaf, color.page)).toBeGreaterThanOrEqual(MIN_LARGE_TEXT);
    expect(contrastRatio(color.leaf, color.page)).toBeLessThan(MIN_TEXT);
  });

  // The recipe sheet rides over it, and the sheet is the page.
  it('is not the same surface as the sheet', () => {
    expect(contrastRatio(color.leaf, color.page)).toBeGreaterThan(1.5);
  });
});

describe('the search field', () => {
  // Typed text and the magnifier both sit on the wash.
  it('carries what is typed into it', () => {
    expect(contrastRatio(color.ink, color.leafWash)).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  // It has no border, so the tint is the only thing marking where the field
  // is — as faint against the white page as the reference's field is against
  // its own. The magnifier and placeholder are what say "type here".
  it('is told apart from the page by its tint', () => {
    expect(color.leafWash).not.toBe(color.page);
    expect(contrastRatio(color.leafWash, color.page)).toBeGreaterThan(1.05);
  });
});

describe('the search result card', () => {
  it('carries its name and its meta line', () => {
    expect(contrastRatio(color.ink, color.porcelainWash)).toBeGreaterThanOrEqual(MIN_TEXT);
    expect(contrastRatio(color.slate, color.porcelainWash)).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  // Borderless, like the reference's, so the fill alone sets it off the page —
  // about as faintly as the reference's #F7F7F7 does on white.
  it('is told apart from the page by its fill', () => {
    expect(color.porcelainWash).not.toBe(color.page);
    expect(contrastRatio(color.porcelainWash, color.page)).toBeGreaterThan(1.05);
  });
});

describe('the placeholder tone', () => {
  // The four on the edit form sit on tile; the search field's sits on the
  // green wash, which is the darker of the two and so the one that binds.
  for (const [name, ground] of [
    ['tile', color.tile],
    ['the search field', color.leafWash],
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

describe('the Meals tab chips', () => {
  // The chips you are not on carry their names in the one green, as the
  // reference's do: 3.1:1 on the pale pill, under the 4.5 a 14pt label asks —
  // the same trade as all green type.
  it('off: the label reads against its pill', () => {
    const { label, pill } = CHIP_COLORS.off;
    expect(contrastRatio(label, pill)).toBeGreaterThanOrEqual(MIN_UI);
  });

  // A pale pill on the white page, as faint as the reference's grey ones; the
  // edge is what draws it, so it has to be darker than the fill it rings.
  it('off: the pill is drawn on the page by its edge', () => {
    const { border, pill } = CHIP_COLORS.off;
    expect(contrastRatio(border, color.page)).toBeGreaterThan(contrastRatio(pill, color.page));
  });

  // White on the green, like every green control.
  it('on: is drawn the way the other green controls are', () => {
    expect(CHIP_COLORS.on.pill).toBe(color.leaf);
    expect(CHIP_COLORS.on.label).toBe(color.page);
  });

  // Which list you are on has to be obvious at a glance: the filled chip
  // stands off the pale ones at control strength, and its label flips too.
  it('the chip you are on separates from the others', () => {
    expect(contrastRatio(CHIP_COLORS.on.pill, CHIP_COLORS.off.pill)).toBeGreaterThanOrEqual(
      MIN_UI,
    );
    expect(CHIP_COLORS.on.label).not.toBe(CHIP_COLORS.off.label);
  });
});
