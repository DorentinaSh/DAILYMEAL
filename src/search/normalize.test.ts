import { BREAD_OMELETTE, CHICKEN_HANDI } from './fixtures';
import { defaultCategory, mergeIngredients, splitSteps, toHit, toHits } from './normalize';

describe('mergeIngredients', () => {
  it('merges each populated measure and ingredient into one line', () => {
    expect(mergeIngredients(BREAD_OMELETTE)).toEqual(['2 Bread', '2 Egg', '0.5 Salt']);
  });

  it('drops empty, whitespace, and null slots', () => {
    expect(mergeIngredients(BREAD_OMELETTE)).toHaveLength(3);
  });

  it('keeps an ingredient that has no measure', () => {
    expect(mergeIngredients({ strIngredient1: 'Salt', strMeasure1: '  ' })).toEqual(['Salt']);
  });

  it('reads all twenty slots', () => {
    const raw: Record<string, string> = {};
    for (let i = 1; i <= 20; i++) raw[`strIngredient${i}`] = `Thing ${i}`;
    expect(mergeIngredients(raw)).toHaveLength(20);
  });
});

describe('splitSteps', () => {
  it('splits a CRLF blob into trimmed steps and drops blank lines', () => {
    expect(splitSteps(CHICKEN_HANDI.strInstructions)).toEqual([
      'Heat the oil and fry the onion until deep golden brown.',
      'Add the garlic and sauté for a minute.',
      'Return the onion to the pot and stir.',
    ]);
  });

  it('returns an empty list when there are no instructions', () => {
    expect(splitSteps(null)).toEqual([]);
    expect(splitSteps('   ')).toEqual([]);
  });
});

describe('defaultCategory', () => {
  it('preselects breakfast only for the source’s Breakfast category', () => {
    expect(defaultCategory('Breakfast')).toBe('breakfast');
    expect(defaultCategory('breakfast')).toBe('breakfast');
  });

  it('preselects lunch for everything else, since the source has no Lunch', () => {
    expect(defaultCategory('Seafood')).toBe('lunch');
    expect(defaultCategory('Dessert')).toBe('lunch');
    expect(defaultCategory('')).toBe('lunch');
  });
});

describe('toHit', () => {
  it('maps a row to our shape', () => {
    expect(toHit(BREAD_OMELETTE)).toEqual({
      id: '53076',
      name: 'Bread omelette',
      imageUrl: 'https://www.themealdb.com/images/media/meals/hqaejl1695738653.jpg',
      sourceCategory: 'Breakfast',
      area: 'India',
      ingredients: ['2 Bread', '2 Egg', '0.5 Salt'],
      steps: ['Make and enjoy'],
    });
  });

  it('survives a missing photo, area, and instructions', () => {
    const hit = toHit({ idMeal: '1', strMeal: 'Toast', strCategory: 'Breakfast' });
    expect(hit.imageUrl).toBeNull();
    expect(hit.area).toBeNull();
    expect(hit.steps).toEqual([]);
    expect(hit.ingredients).toEqual([]);
  });
});

describe('toHits', () => {
  it('maps every row in a response', () => {
    const hits = toHits({ meals: [BREAD_OMELETTE, CHICKEN_HANDI] });
    expect(hits.map((hit) => hit.name)).toEqual(['Bread omelette', 'Chicken Handi']);
  });

  it('treats the source’s null for no results as an empty list', () => {
    expect(toHits({ meals: null })).toEqual([]);
    expect(toHits({})).toEqual([]);
  });

  it('skips rows with no id or no name', () => {
    expect(toHits({ meals: [{ idMeal: '', strMeal: 'Nameless' }, BREAD_OMELETTE] })).toHaveLength(1);
  });
});
