import {
  addMeal,
  addSavedToMeals,
  canSkip,
  createEmptyState,
  currentMeal,
  dateKey,
  deleteMeal,
  mealsIn,
  rollover,
  skip,
  updateMeal,
} from './cycle';
import { saveFromMeal, savedById, savedForMeal } from './saved';
import type { AppState, Category, Meal } from './types';

/** Deterministic RNG so shuffles are reproducible in tests. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG that always returns 0 — Fisher-Yates then leaves order untouched. */
const zero = () => 0;

function meal(id: string, category: Category = 'breakfast'): Meal {
  return {
    id,
    name: `Meal ${id}`,
    category,
    ingredients: ['thing'],
    steps: ['do it'],
    prepMinutes: 5,
  };
}

/**
 * Builds a state with an explicit cycle order, bypassing shuffle so the
 * assertions below can name exact meals.
 */
function stateWith(
  ids: string[],
  position = 0,
  opts: { date?: string; category?: Category; skippedToday?: string[] } = {},
): AppState {
  const category = opts.category ?? 'breakfast';
  const date = opts.date ?? '2026-08-24';
  const base = createEmptyState();
  return {
    ...base,
    meals: ids.map((id) => meal(id, category)),
    cycles: { ...base.cycles, [category]: { order: [...ids], position } },
    today: {
      ...base.today,
      [category]: {
        date,
        mealId: ids[position] ?? null,
        skippedToday: opts.skippedToday ?? [],
      },
    },
  };
}

describe('dateKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 7, 24, 13, 45))).toBe('2026-08-24');
  });

  it('pads single-digit months and days', () => {
    expect(dateKey(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it('uses local time, not UTC, near midnight', () => {
    // 23:30 local stays on the same local day regardless of UTC offset.
    expect(dateKey(new Date(2026, 7, 24, 23, 30))).toBe('2026-08-24');
  });
});

describe('rollover', () => {
  it('serves the next meal in the cycle on a new day', () => {
    const s = stateWith(['a', 'b', 'c'], 0, { date: '2026-08-24' });
    const next = rollover(s, '2026-08-25', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
    expect(next.today.breakfast.date).toBe('2026-08-25');
  });

  it('does nothing when the date is unchanged', () => {
    const s = stateWith(['a', 'b', 'c'], 1, { date: '2026-08-24' });
    const next = rollover(s, '2026-08-24', zero);
    expect(next.cycles.breakfast.position).toBe(1);
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
  });

  it('advances exactly one meal even when several days passed', () => {
    const s = stateWith(['a', 'b', 'c'], 0, { date: '2026-08-24' });
    const next = rollover(s, '2026-09-30', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
  });

  it('advances exactly one meal even when the clock moved backwards', () => {
    const s = stateWith(['a', 'b', 'c'], 0, { date: '2026-08-24' });
    const next = rollover(s, '2026-08-20', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
    expect(next.today.breakfast.date).toBe('2026-08-20');
  });

  it('reshuffles into a new cycle after the last meal', () => {
    const s = stateWith(['a', 'b', 'c'], 2, { date: '2026-08-24' });
    const next = rollover(s, '2026-08-25', seeded(7));
    expect(next.cycles.breakfast.position).toBe(0);
    expect([...next.cycles.breakfast.order].sort()).toEqual(['a', 'b', 'c']);
  });

  it('never repeats the previous cycle’s last meal on the next day', () => {
    // Run many seeds; a new cycle must never open with the meal just served.
    for (let seed = 1; seed <= 200; seed++) {
      const s = stateWith(['a', 'b', 'c'], 2, { date: '2026-08-24' });
      const next = rollover(s, '2026-08-25', seeded(seed));
      expect(next.cycles.breakfast.order[0]).not.toBe('c');
    }
  });

  it('clears the skip list for the new day', () => {
    const s = stateWith(['a', 'b', 'c'], 0, {
      date: '2026-08-24',
      skippedToday: ['x'],
    });
    const next = rollover(s, '2026-08-25', zero);
    expect(next.today.breakfast.skippedToday).toEqual([]);
  });

  it('serves the only meal every day when the category has one', () => {
    const s = stateWith(['a'], 0, { date: '2026-08-24' });
    const next = rollover(s, '2026-08-25', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('a');
  });

  it('leaves an empty category with no meal', () => {
    const s = createEmptyState();
    const next = rollover(s, '2026-08-25', zero);
    expect(currentMeal(next, 'breakfast')).toBeNull();
    expect(next.today.breakfast.mealId).toBeNull();
  });

  it('rolls categories over independently', () => {
    const base = createEmptyState();
    const s: AppState = {
      ...base,
      meals: [meal('a'), meal('b'), meal('x', 'lunch'), meal('y', 'lunch')],
      cycles: {
        breakfast: { order: ['a', 'b'], position: 0 },
        lunch: { order: ['x', 'y'], position: 1 },
      },
      today: {
        breakfast: { date: '2026-08-24', mealId: 'a', skippedToday: [] },
        lunch: { date: '2026-08-24', mealId: 'y', skippedToday: [] },
      },
    };
    const next = rollover(s, '2026-08-25', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
    expect(next.cycles.lunch.position).toBe(0);
  });
});

describe('skip', () => {
  it('serves the next meal without advancing the day', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const next = skip(s, 'breakfast', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
    expect(next.today.breakfast.date).toBe('2026-08-24');
  });

  it('moves the skipped meal to the back of the loop', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const next = skip(s, 'breakfast', zero);
    expect(next.cycles.breakfast.order).toEqual(['b', 'c', 'a']);
    expect(next.cycles.breakfast.position).toBe(0);
  });

  it('records the skip for today', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const next = skip(s, 'breakfast', zero);
    expect(next.today.breakfast.skippedToday).toEqual(['a']);
  });

  it('opens a fresh cycle when skipping the last meal of one', () => {
    // Removing the last element would otherwise re-serve the same meal.
    const s = stateWith(['a', 'b', 'c'], 2);
    const next = skip(s, 'breakfast', seeded(3));
    expect(currentMeal(next, 'breakfast')?.id).not.toBe('c');
    expect(next.cycles.breakfast.position).toBe(0);
    expect([...next.cycles.breakfast.order].sort()).toEqual(['a', 'b', 'c']);
    // The rejected meal goes to the back so it will not return today.
    expect(next.cycles.breakfast.order[2]).toBe('c');
  });

  it('never serves the same meal it just skipped', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const position of [0, 1, 2]) {
        const s = stateWith(['a', 'b', 'c'], position);
        const before = currentMeal(s, 'breakfast')!.id;
        const next = skip(s, 'breakfast', seeded(seed));
        expect(currentMeal(next, 'breakfast')?.id).not.toBe(before);
      }
    }
  });

  it('leaves the other category untouched', () => {
    const base = createEmptyState();
    const s: AppState = {
      ...base,
      meals: [meal('a'), meal('b'), meal('x', 'lunch'), meal('y', 'lunch')],
      cycles: {
        breakfast: { order: ['a', 'b'], position: 0 },
        lunch: { order: ['x', 'y'], position: 0 },
      },
      today: {
        breakfast: { date: '2026-08-24', mealId: 'a', skippedToday: [] },
        lunch: { date: '2026-08-24', mealId: 'x', skippedToday: [] },
      },
    };
    const next = skip(s, 'breakfast', zero);
    expect(next.cycles.lunch).toEqual(s.cycles.lunch);
    expect(next.today.lunch).toEqual(s.today.lunch);
  });
});

describe('canSkip', () => {
  it('is false for an empty category', () => {
    expect(canSkip(createEmptyState(), 'breakfast')).toBe(false);
  });

  it('is false when the category has a single meal', () => {
    expect(canSkip(stateWith(['a']), 'breakfast')).toBe(false);
  });

  it('is true when other meals remain unseen today', () => {
    expect(canSkip(stateWith(['a', 'b', 'c']), 'breakfast')).toBe(true);
  });

  it('is false once every other meal has been rejected today', () => {
    const s = stateWith(['c', 'a', 'b'], 0, { skippedToday: ['a', 'b'] });
    expect(canSkip(s, 'breakfast')).toBe(false);
  });

  it('blocks the skip that would wrap back to an already-rejected meal', () => {
    let s = stateWith(['a', 'b'], 0);
    expect(canSkip(s, 'breakfast')).toBe(true);
    s = skip(s, 'breakfast', zero);
    expect(currentMeal(s, 'breakfast')?.id).toBe('b');
    expect(canSkip(s, 'breakfast')).toBe(false);
  });
});

describe('addMeal', () => {
  it('places the first meal of a category on today’s card', () => {
    const s = addMeal(createEmptyState(), meal('a'), zero);
    expect(s.cycles.breakfast.order).toEqual(['a']);
    expect(currentMeal(s, 'breakfast')?.id).toBe('a');
  });

  it('inserts into the current cycle after the position being served', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const s = stateWith(['a', 'b', 'c'], 1);
      const next = addMeal(s, meal('d'), seeded(seed));
      const at = next.cycles.breakfast.order.indexOf('d');
      expect(at).toBeGreaterThan(1);
    }
  });

  it('does not change which meal is being served', () => {
    const s = stateWith(['a', 'b', 'c'], 1);
    const next = addMeal(s, meal('d'), seeded(5));
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
  });

  it('adds to the cycle matching the meal’s category', () => {
    const s = stateWith(['a', 'b'], 0);
    const next = addMeal(s, meal('x', 'lunch'), zero);
    expect(next.cycles.lunch.order).toEqual(['x']);
    expect(next.cycles.breakfast.order).toEqual(['a', 'b']);
  });
});

describe('deleteMeal', () => {
  it('removes the meal from the library and its cycle', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const next = deleteMeal(s, 'b', zero);
    expect(next.meals.map((m) => m.id)).toEqual(['a', 'c']);
    expect(next.cycles.breakfast.order).toEqual(['a', 'c']);
  });

  it('keeps serving the same meal when an earlier one is deleted', () => {
    const s = stateWith(['a', 'b', 'c'], 2);
    const next = deleteMeal(s, 'a', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('c');
  });

  it('re-rolls immediately when today’s meal is deleted', () => {
    const s = stateWith(['a', 'b', 'c'], 1);
    const next = deleteMeal(s, 'b', zero);
    expect(currentMeal(next, 'breakfast')?.id).toBe('c');
  });

  it('wraps into a new cycle when the last meal is deleted', () => {
    const s = stateWith(['a', 'b', 'c'], 2);
    const next = deleteMeal(s, 'c', zero);
    expect(next.cycles.breakfast.position).toBeLessThan(2);
    expect(currentMeal(next, 'breakfast')).not.toBeNull();
  });

  it('empties the card when the last meal of a category goes', () => {
    const s = stateWith(['a'], 0);
    const next = deleteMeal(s, 'a', zero);
    expect(next.cycles.breakfast.order).toEqual([]);
    expect(currentMeal(next, 'breakfast')).toBeNull();
    expect(next.today.breakfast.mealId).toBeNull();
  });

  it('is a no-op for an unknown id', () => {
    const s = stateWith(['a', 'b'], 0);
    expect(deleteMeal(s, 'nope', zero)).toEqual(s);
  });
});

describe('updateMeal', () => {
  it('saves edits without disturbing the cycle', () => {
    const s = stateWith(['a', 'b', 'c'], 1);
    const edited = { ...meal('b'), name: 'Renamed' };
    const next = updateMeal(s, edited, zero);
    expect(next.meals.find((m) => m.id === 'b')?.name).toBe('Renamed');
    expect(next.cycles.breakfast.order).toEqual(['a', 'b', 'c']);
    expect(currentMeal(next, 'breakfast')?.id).toBe('b');
  });

  it('moves the meal between cycles when its category changes', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const moved = { ...meal('b'), category: 'lunch' as Category };
    const next = updateMeal(s, moved, zero);
    expect(next.cycles.breakfast.order).toEqual(['a', 'c']);
    expect(next.cycles.lunch.order).toEqual(['b']);
    expect(mealsIn(next, 'lunch').map((m) => m.id)).toEqual(['b']);
  });

  it('re-rolls when the meal being served moves to another category', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const moved = { ...meal('a'), category: 'lunch' as Category };
    const next = updateMeal(s, moved, zero);
    expect(currentMeal(next, 'breakfast')?.id).not.toBe('a');
    expect(currentMeal(next, 'lunch')?.id).toBe('a');
  });
});

describe('mealsIn', () => {
  it('returns only the requested category', () => {
    const base = createEmptyState();
    const s: AppState = {
      ...base,
      meals: [meal('a'), meal('x', 'lunch'), meal('b')],
    };
    expect(mealsIn(s, 'breakfast').map((m) => m.id)).toEqual(['a', 'b']);
    expect(mealsIn(s, 'lunch').map((m) => m.id)).toEqual(['x']);
  });
});

describe('state is never mutated in place', () => {
  it('leaves the input untouched across every operation', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const snapshot = JSON.stringify(s);
    skip(s, 'breakfast', zero);
    rollover(s, '2026-08-25', zero);
    addMeal(s, meal('d'), zero);
    deleteMeal(s, 'a', zero);
    updateMeal(s, { ...meal('a'), name: 'Changed' }, zero);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('deleteMeal and the saved list', () => {
  it('keeps the saved recipe and cuts its link', () => {
    const added = addMeal(createEmptyState(), meal('a'), zero);
    const kept = saveFromMeal(added, meal('a'), 's1');

    const after = deleteMeal(kept, 'a', zero);

    expect(after.meals).toEqual([]);
    expect(after.saved).toHaveLength(1);
    expect(after.saved[0].mealId).toBeNull();
    expect(after.saved[0].name).toBe('Meal a');
  });

  it('leaves a recipe saved from search untouched', () => {
    const added = addMeal(createEmptyState(), meal('a'), zero);
    const kept = saveFromMeal(added, meal('b'), 's1');

    const after = deleteMeal(kept, 'a', zero);

    expect(savedById(after, 's1')?.mealId).toBe('b');
  });
});

describe('updateMeal and the saved list', () => {
  it('keeps a category change linked to its bookmark', () => {
    const added = addMeal(createEmptyState(), meal('a', 'breakfast'), zero);
    const kept = saveFromMeal(added, meal('a', 'breakfast'), 's1');

    const after = updateMeal(kept, meal('a', 'lunch'), zero);

    expect(savedForMeal(after, 'a')?.id).toBe('s1');
  });

  it('moves the bookmark’s category along with the meal’s', () => {
    const added = addMeal(createEmptyState(), meal('a', 'breakfast'), zero);
    const kept = saveFromMeal(added, meal('a', 'breakfast'), 's1');

    const after = updateMeal(kept, meal('a', 'lunch'), zero);

    expect(savedForMeal(after, 'a')?.category).toBe('lunch');
  });

  it('leaves the saved list untouched when there is no bookmark', () => {
    const added = addMeal(createEmptyState(), meal('a', 'breakfast'), zero);

    const after = updateMeal(added, meal('a', 'lunch'), zero);

    expect(after.saved).toEqual([]);
  });

  it('syncs a bookmarked meal’s edited text onto its linked entry', () => {
    const added = addMeal(createEmptyState(), meal('a', 'breakfast'), zero);
    const kept = saveFromMeal(added, meal('a', 'breakfast'), 's1');
    const edited: Meal = {
      ...meal('a', 'breakfast'),
      name: 'Renamed dish',
      ingredients: ['new ingredient'],
      steps: ['new step'],
      prepMinutes: 42,
    };

    const after = updateMeal(kept, edited, zero);

    expect(savedForMeal(after, 'a')).toMatchObject({
      name: 'Renamed dish',
      ingredients: ['new ingredient'],
      steps: ['new step'],
      prepMinutes: 42,
    });
  });

  it('leaves an unrelated saved entry alone when editing a meal with no bookmark of its own', () => {
    const twoMeals = addMeal(
      addMeal(createEmptyState(), meal('a', 'breakfast'), zero),
      meal('b', 'breakfast'),
      zero,
    );
    const base = saveFromMeal(twoMeals, meal('a', 'breakfast'), 's1');
    const edited = { ...meal('b', 'breakfast'), name: 'Edited b' };

    const after = updateMeal(base, edited, zero);

    expect(after.saved).toEqual(base.saved);
  });

  it('syncs the recipe text along with the category on a category change', () => {
    const added = addMeal(createEmptyState(), meal('a', 'breakfast'), zero);
    const kept = saveFromMeal(added, meal('a', 'breakfast'), 's1');
    const edited: Meal = {
      ...meal('a', 'lunch'),
      name: 'Renamed dish',
      ingredients: ['new ingredient'],
    };

    const after = updateMeal(kept, edited, zero);

    expect(savedForMeal(after, 'a')).toMatchObject({
      name: 'Renamed dish',
      ingredients: ['new ingredient'],
      category: 'lunch',
    });
  });
});

describe('addSavedToMeals', () => {
  const recipe = {
    id: 's1',
    name: 'Chicken Handi',
    imageUrl: 'https://example.test/handi.jpg',
    ingredients: ['1.2 kg Chicken'],
    steps: ['Fry the onion'],
    prepMinutes: null,
    category: 'lunch' as const,
    sourceId: '52795',
    mealId: null,
  };

  function withRecipe() {
    return { ...createEmptyState(), saved: [recipe] };
  }

  it('creates the meal from the recipe', () => {
    const after = addSavedToMeals(withRecipe(), recipe, 'lunch', 'm1', zero);

    expect(mealsIn(after, 'lunch')).toEqual([
      {
        id: 'm1',
        name: 'Chicken Handi',
        category: 'lunch',
        ingredients: ['1.2 kg Chicken'],
        steps: ['Fry the onion'],
        prepMinutes: null,
      },
    ]);
  });

  it('links the saved recipe to the meal it made', () => {
    const after = addSavedToMeals(withRecipe(), recipe, 'lunch', 'm1', zero);

    expect(savedForMeal(after, 'm1')?.id).toBe('s1');
  });

  it('puts the meal into the rotation', () => {
    const after = addSavedToMeals(withRecipe(), recipe, 'lunch', 'm1', zero);

    expect(after.cycles.lunch.order).toEqual(['m1']);
  });

  // The category chosen on the way in is the one the recipe keeps, so the
  // bookmark and the meal never disagree about what kind of dish it is.
  it('records the category that was chosen', () => {
    const after = addSavedToMeals(withRecipe(), recipe, 'breakfast', 'm1', zero);

    expect(savedById(after, 's1')?.category).toBe('breakfast');
    expect(mealsIn(after, 'breakfast')).toHaveLength(1);
  });

  it('refuses a recipe already in the rotation', () => {
    const once = addSavedToMeals(withRecipe(), recipe, 'lunch', 'm1', zero);
    const linked = savedById(once, 's1');
    const twice = addSavedToMeals(once, linked!, 'lunch', 'm2', zero);

    expect(twice).toBe(once);
  });
});
