import type { Meal } from '@/domain/types';
import { isKept, keptAsMeal } from './keep';
import type { RecipeHit } from './types';

const shakshuka: RecipeHit = {
  id: '52771',
  name: 'Shakshuka',
  imageUrl: 'https://themealdb.example/shakshuka.jpg',
  sourceCategory: 'Breakfast',
  area: 'Israeli',
  ingredients: ['4 eggs', '1 tin chopped tomatoes', '1 onion'],
  steps: ['Fry the onion', 'Add the tomatoes', 'Crack the eggs in'],
};

describe('keeping a found recipe as a meal', () => {
  it('carries across everything the source publishes', () => {
    expect(keptAsMeal(shakshuka, 'breakfast', false)).toEqual({
      name: 'Shakshuka',
      category: 'breakfast',
      imageUrl: 'https://themealdb.example/shakshuka.jpg',
      ingredients: ['4 eggs', '1 tin chopped tomatoes', '1 onion'],
      steps: ['Fry the onion', 'Add the tomatoes', 'Crack the eggs in'],
      prepMinutes: null,
      saved: false,
    });
  });

  // The bug this guards: the photo is the thing that made you open the recipe,
  // and it was dropped at the exact moment you decided to keep it — so a meal
  // of your own could never have a face, however it arrived.
  it('keeps the photo', () => {
    expect(keptAsMeal(shakshuka, 'breakfast', false).imageUrl).toBe(shakshuka.imageUrl);
  });

  it('records a recipe that has no photo as having none', () => {
    expect(keptAsMeal({ ...shakshuka, imageUrl: null }, 'lunch', false).imageUrl).toBeNull();
  });

  it('takes the category and the keep-for-later decision from the screen', () => {
    const meal = keptAsMeal(shakshuka, 'lunch', true);
    expect(meal.category).toBe('lunch');
    expect(meal.saved).toBe(true);
  });

  // The source publishes no prep time, and a guessed number would be a wrong
  // number sitting in front of someone.
  it('leaves prep time for you to fill in', () => {
    expect(keptAsMeal(shakshuka, 'lunch', false).prepMinutes).toBeNull();
  });

  it('does not invent an id — the store mints that when the meal is added', () => {
    expect(keptAsMeal(shakshuka, 'lunch', false)).not.toHaveProperty('id');
  });
});

describe('telling whether a found recipe is already one of your meals', () => {
  const kept: Meal = { ...keptAsMeal(shakshuka, 'breakfast', false), id: 'm1' };

  it('knows a recipe you kept', () => {
    expect(isKept(shakshuka, [kept])).toBe(true);
  });

  it('knows nothing is kept when you have no meals', () => {
    expect(isKept(shakshuka, [])).toBe(false);
  });

  // A meal you typed yourself has no source photo, so sharing a name with a
  // recipe does not make it that recipe.
  it('does not mistake a meal you typed with the same name for it', () => {
    const typed: Meal = { ...kept, id: 'm2', imageUrl: undefined };
    expect(isKept(shakshuka, [typed])).toBe(false);
  });

  // The photo is the recipe's identity, not the name: renaming the meal you
  // kept does not make the recipe addable again as if it were new.
  it('still knows it after you rename the meal', () => {
    const renamed: Meal = { ...kept, name: 'Weekend shakshuka' };
    expect(isKept(shakshuka, [renamed])).toBe(true);
  });

  it('does not confuse it with a different recipe you kept', () => {
    const other: Meal = { ...kept, imageUrl: 'https://themealdb.example/omelette.jpg' };
    expect(isKept(shakshuka, [other])).toBe(false);
  });

  // With no photo there is nothing to recognise it by, and guessing from the
  // name would tick recipes you never added.
  it('never claims a recipe with no photo, which it cannot recognise', () => {
    const bare = { ...shakshuka, imageUrl: null };
    const keptBare: Meal = { ...keptAsMeal(bare, 'lunch', false), id: 'm3' };
    expect(isKept(bare, [keptBare])).toBe(false);
  });
});
