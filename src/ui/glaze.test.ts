import { glazeFor } from './glaze';
import { color, GLAZES } from './theme';

describe('the glaze a meal wears', () => {
  it('always gives the same meal the same colour', () => {
    expect(glazeFor('Overnight oats')).toBe(glazeFor('Overnight oats'));
  });

  it('only ever returns a colour from the set', () => {
    for (const name of ['Shakshuka', 'Full English', 'x', '3-bean chilli', '🍳 eggs', '']) {
      expect(GLAZES).toContain(glazeFor(name));
    }
  });

  it('ignores capitalisation and stray padding, so fixing a typo keeps the colour', () => {
    expect(glazeFor('  overnight OATS ')).toBe(glazeFor('Overnight oats'));
  });

  it('still gives a colour to a name with nothing in it', () => {
    expect(GLAZES).toContain(glazeFor(''));
    expect(GLAZES).toContain(glazeFor('   '));
  });

  // A mark wearing the old ink is indistinguishable from the glazes not working,
  // which is exactly how this was first reported.
  it('never returns the ink a mark used to be', () => {
    expect(GLAZES).not.toContain(color.ink);
  });

  // The bug this guards: reading the hash's low bits put six realistic
  // breakfasts on two colours. A list has to look varied, not striped.
  it('spreads a realistic list across most of the set', () => {
    const breakfasts = [
      'Overnight oats', 'Shakshuka', 'Scrambled eggs',
      'Yoghurt and granola', 'Full English', 'Banana pancakes',
    ];
    expect(new Set(breakfasts.map(glazeFor)).size).toBeGreaterThanOrEqual(4);
  });

  it('uses every colour in the set across a larger library', () => {
    const many = [
      'Overnight oats', 'Shakshuka', 'Scrambled eggs', 'Yoghurt and granola',
      'Full English', 'Banana pancakes', 'Porridge', 'French toast',
      'Chicken fajita wrap', 'Tomato soup', 'Caesar salad', 'Fried rice',
      'Omelette', 'Avocado toast', 'Muesli', 'Pancakes', 'Smoothie bowl',
      'Eggs benedict', 'Ramen', 'Pad thai', 'Chilli', 'Lasagne', 'Risotto',
      'Fish and chips', 'Burger', 'Pizza', 'Tacos', 'Curry',
    ];
    expect(new Set(many.map(glazeFor)).size).toBe(GLAZES.length);
  });

  // Known answers, pinned deliberately. Change the hash or reorder GLAZES and
  // meals people have had for months quietly become another colour on update,
  // with nothing else failing to say so.
  it('maps these names to exactly these colours, now and after any refactor', () => {
    expect(glazeFor('Overnight oats')).toBe('#4A1E35');
    expect(glazeFor('Shakshuka')).toBe('#4A1E35');
    expect(glazeFor('Scrambled eggs')).toBe('#2E3A18');
    expect(glazeFor('Yoghurt and granola')).toBe('#6B2D1E');
    expect(glazeFor('Full English')).toBe('#6B1F22');
  });
});
