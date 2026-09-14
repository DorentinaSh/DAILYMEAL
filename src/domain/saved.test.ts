import { createEmptyState } from './cycle';
import {
  saveFromHit,
  saveFromMeal,
  savedById,
  savedForMeal,
  savedForSource,
  unlinkMeal,
  unsave,
} from './saved';
import type { AppState, Meal } from './types';

function meal(id: string): Meal {
  return {
    id,
    name: `Meal ${id}`,
    category: 'breakfast',
    ingredients: ['thing'],
    steps: ['do it'],
    prepMinutes: 5,
  };
}

/** The shape a search result arrives in, with only the parts a bookmark needs. */
function found(id: string) {
  return {
    id,
    name: `Dish ${id}`,
    imageUrl: `https://example.test/${id}.jpg`,
    ingredients: ['2 Bread'],
    steps: ['Make it'],
  };
}

function withMeals(...meals: Meal[]): AppState {
  return { ...createEmptyState(), meals };
}

describe('saveFromMeal', () => {
  it('keeps a copy of the meal, linked back to it', () => {
    const state = saveFromMeal(withMeals(meal('a')), meal('a'), 's1');

    expect(state.saved).toHaveLength(1);
    expect(state.saved[0]).toMatchObject({
      id: 's1',
      name: 'Meal a',
      mealId: 'a',
      sourceId: null,
      category: 'breakfast',
      prepMinutes: 5,
    });
  });

  // Meals carry no photo, so there is none to copy.
  it('leaves the photo empty', () => {
    const state = saveFromMeal(withMeals(meal('a')), meal('a'), 's1');

    expect(state.saved[0].imageUrl).toBeNull();
  });

  it('refuses to keep the same meal twice', () => {
    const once = saveFromMeal(withMeals(meal('a')), meal('a'), 's1');
    const twice = saveFromMeal(once, meal('a'), 's2');

    expect(twice).toBe(once);
  });
});

describe('saveFromHit', () => {
  it('keeps a found recipe with its photo and no meal behind it', () => {
    const state = saveFromHit(createEmptyState(), found('52795'), 'lunch', 's1');

    expect(state.saved[0]).toMatchObject({
      id: 's1',
      name: 'Dish 52795',
      imageUrl: 'https://example.test/52795.jpg',
      sourceId: '52795',
      mealId: null,
      category: 'lunch',
      prepMinutes: null,
    });
  });

  it('refuses to keep the same dish twice', () => {
    const once = saveFromHit(createEmptyState(), found('52795'), 'lunch', 's1');
    const twice = saveFromHit(once, found('52795'), 'breakfast', 's2');

    expect(twice).toBe(once);
  });

  it('puts the newest recipe first', () => {
    const first = saveFromHit(createEmptyState(), found('1'), 'lunch', 's1');
    const second = saveFromHit(first, found('2'), 'lunch', 's2');

    expect(second.saved.map((r) => r.id)).toEqual(['s2', 's1']);
  });
});

describe('unsave', () => {
  it('removes only the entry named', () => {
    const first = saveFromHit(createEmptyState(), found('1'), 'lunch', 's1');
    const both = saveFromHit(first, found('2'), 'lunch', 's2');

    expect(unsave(both, 's1').saved.map((r) => r.id)).toEqual(['s2']);
  });

  it('leaves the state alone when the entry is not there', () => {
    const state = saveFromHit(createEmptyState(), found('1'), 'lunch', 's1');

    expect(unsave(state, 'nope')).toBe(state);
  });
});

describe('unlinkMeal', () => {
  it('cuts the link and keeps the recipe', () => {
    const state = saveFromMeal(withMeals(meal('a')), meal('a'), 's1');

    const after = unlinkMeal(state, 'a');

    expect(after.saved).toHaveLength(1);
    expect(after.saved[0].mealId).toBeNull();
    expect(after.saved[0].ingredients).toEqual(['thing']);
  });

  it('leaves entries linked to other meals alone', () => {
    const one = saveFromMeal(withMeals(meal('a'), meal('b')), meal('a'), 's1');
    const both = saveFromMeal(one, meal('b'), 's2');

    const after = unlinkMeal(both, 'a');

    expect(savedForMeal(after, 'b')?.id).toBe('s2');
  });

  it('leaves the state alone when no entry points at that meal', () => {
    const state = saveFromHit(createEmptyState(), found('1'), 'lunch', 's1');

    expect(unlinkMeal(state, 'a')).toBe(state);
  });
});

describe('lookups', () => {
  it('finds an entry by its own id, by meal and by source', () => {
    const fromMeal = saveFromMeal(withMeals(meal('a')), meal('a'), 's1');
    const both = saveFromHit(fromMeal, found('52795'), 'lunch', 's2');

    expect(savedById(both, 's1')?.mealId).toBe('a');
    expect(savedForMeal(both, 'a')?.id).toBe('s1');
    expect(savedForSource(both, '52795')?.id).toBe('s2');
  });

  it('answers null for anything it does not hold', () => {
    const state = createEmptyState();

    expect(savedById(state, null)).toBeNull();
    expect(savedById(state, 'nope')).toBeNull();
    expect(savedForMeal(state, 'nope')).toBeNull();
    expect(savedForSource(state, 'nope')).toBeNull();
  });
});
