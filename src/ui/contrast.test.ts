import { color, SAVE_COLORS } from './theme';
import { contrastRatio } from './contrast';

/** WCAG 1.4.11: a control that isn't text still has to be seen. */
const MIN_UI = 3;

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
