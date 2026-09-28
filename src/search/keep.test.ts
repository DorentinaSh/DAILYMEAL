import { keptAsMeal } from './keep';
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
