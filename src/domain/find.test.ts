import { matchesQuery } from './find';

const oats = { name: 'Overnight oats', ingredients: ['rolled oats', 'milk', 'honey'] };
const handi = {
  name: 'Chicken Handi',
  ingredients: ['1.2 kg chicken', '5 thinly sliced onions', 'basmati rice'],
};
const greens = { name: 'Sautéed greens', ingredients: ['spinach', 'garlic'] };

describe('matchesQuery', () => {
  it('lets every meal through when there is nothing typed', () => {
    expect(matchesQuery(oats, '')).toBe(true);
    expect(matchesQuery(oats, '   ')).toBe(true);
  });

  it('finds a meal by any part of its name, whatever the case', () => {
    expect(matchesQuery(handi, 'handi')).toBe(true);
    expect(matchesQuery(handi, 'CHICK')).toBe(true);
    expect(matchesQuery(oats, 'night')).toBe(true);
  });

  it('finds a meal by what goes in it', () => {
    expect(matchesQuery(oats, 'honey')).toBe(true);
    expect(matchesQuery(handi, 'onion')).toBe(true);
  });

  it('ignores accents on either side', () => {
    expect(matchesQuery(greens, 'saute')).toBe(true);
    expect(matchesQuery({ name: 'Saute pan eggs', ingredients: [] }, 'sauté')).toBe(true);
  });

  it('wants every word, each anywhere in the name or the ingredients', () => {
    expect(matchesQuery(handi, 'chicken rice')).toBe(true);
    expect(matchesQuery(handi, '  rice   chicken ')).toBe(true);
    expect(matchesQuery(handi, 'chicken pasta')).toBe(false);
  });

  it('turns away a meal with nothing that matches', () => {
    expect(matchesQuery(oats, 'chicken')).toBe(false);
  });
});
