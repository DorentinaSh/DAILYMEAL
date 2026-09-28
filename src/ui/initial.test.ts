import { initialFor } from './initial';

describe('the letter a meal wears when it has no photo', () => {
  it('takes the first letter, capitalised', () => {
    expect(initialFor('Overnight oats')).toBe('O');
    expect(initialFor('scrambled eggs')).toBe('S');
  });

  it('ignores padding a name was typed with', () => {
    expect(initialFor('   porridge ')).toBe('P');
  });

  it('keeps a leading digit as it is', () => {
    expect(initialFor('3-bean chilli')).toBe('3');
  });

  // Indexing with [0] would cut a multi-unit glyph in half and render a
  // replacement box, so the first *character* is what gets taken.
  it('takes a whole glyph, not half of a surrogate pair', () => {
    expect(initialFor('🍳 eggs')).toBe('🍳');
  });

  it('capitalises an accented letter', () => {
    expect(initialFor('éclair')).toBe('É');
  });

  // A meal cannot be saved without a name, but a mark that throws would take
  // the whole list down with it.
  it('gives back nothing for a name with nothing in it', () => {
    expect(initialFor('')).toBe('');
    expect(initialFor('   ')).toBe('');
  });
});
