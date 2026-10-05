import {
  addMeal,
  canSkip,
  createEmptyState,
  currentMeal,
  dateKey,
  deleteMeal,
  mealsIn,
  placeMeal,
  rollover,
  skip,
  toggleSaved,
  updateMeal,
} from './cycle';
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

/** A recipe kept for later and in no list: the only shape such a meal takes. */
function savedOnly(id: string): Meal {
  return { ...meal(id), category: null, saved: true };
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

describe('addMeal keeps the saved flag', () => {
  // The path a recipe takes from search: bookmarked on its page, created
  // already kept, and so present under the Meals filter without a second tap.
  it('files a meal that arrives already saved', () => {
    const state = addMeal(createEmptyState(), { ...meal('a'), saved: true }, zero);

    expect(state.meals.filter((m) => m.saved).map((m) => m.id)).toEqual(['a']);
  });

  it('leaves a meal that arrives without the flag unsaved', () => {
    const state = addMeal(createEmptyState(), meal('a'), zero);

    expect(state.meals.filter((m) => m.saved)).toEqual([]);
  });
});

describe('toggleSaved', () => {
  it('marks an unsaved meal as saved', () => {
    const state = addMeal(createEmptyState(), meal('a'), zero);

    expect(toggleSaved(state, 'a').meals[0].saved).toBe(true);
  });

  it('unmarks a saved meal', () => {
    const state = toggleSaved(addMeal(createEmptyState(), meal('a'), zero), 'a');

    expect(toggleSaved(state, 'a').meals[0].saved).toBe(false);
  });

  it('leaves every other meal alone', () => {
    let state = addMeal(createEmptyState(), meal('a'), zero);
    state = addMeal(state, meal('b'), zero);

    const after = toggleSaved(state, 'a');

    expect(after.meals.find((m) => m.id === 'b')?.saved).toBeUndefined();
  });

  // The whole point of a separate function: saving must not touch the rotation.
  it('leaves the cycles and today’s pick untouched', () => {
    let state = addMeal(createEmptyState(), meal('a'), zero);
    state = addMeal(state, meal('b'), zero);
    state = rollover(state, '2026-09-04');

    const after = toggleSaved(state, 'a');

    expect(after.cycles).toEqual(state.cycles);
    expect(after.today).toEqual(state.today);
  });

  it('ignores an id that is not there', () => {
    const state = addMeal(createEmptyState(), meal('a'), zero);

    expect(toggleSaved(state, 'nope')).toEqual(state);
  });
});

describe('saved-only meals', () => {
  it('are in no category', () => {
    const s = addMeal(stateWith(['a', 'b'], 0), savedOnly('s'), zero);
    expect(mealsIn(s, 'breakfast').map((m) => m.id)).toEqual(['a', 'b']);
    expect(mealsIn(s, 'lunch')).toEqual([]);
  });

  it('are added without touching any cycle or today’s pick', () => {
    const s = stateWith(['a', 'b'], 1);
    const next = addMeal(s, savedOnly('s'), zero);
    expect(next.meals.map((m) => m.id)).toEqual(['a', 'b', 's']);
    expect(next.cycles).toEqual(s.cycles);
    expect(next.today).toEqual(s.today);
  });

  // There is no other way for one to exist, so the domain enforces it rather
  // than trusting every caller to remember.
  it('are always stored as saved', () => {
    const next = addMeal(createEmptyState(), { ...savedOnly('s'), saved: false }, zero);
    expect(next.meals[0].saved).toBe(true);
  });

  // The whole point: something you only saved never turns up as today's meal.
  it('are never served, however many days pass', () => {
    let s = addMeal(stateWith(['a', 'b'], 0), savedOnly('s'), zero);
    for (let day = 25; day <= 31; day++) {
      s = rollover(s, `2026-08-${day}`, seeded(day));
      expect(s.today.breakfast.mealId).not.toBe('s');
      expect(s.today.lunch.mealId).toBeNull();
    }
  });

  it('do not count towards a skip, and are never skipped to', () => {
    const one = addMeal(stateWith(['a'], 0), savedOnly('s'), zero);
    expect(canSkip(one, 'breakfast')).toBe(false);

    const two = addMeal(stateWith(['a', 'b'], 0), savedOnly('s'), zero);
    expect(skip(two, 'breakfast', zero).today.breakfast.mealId).toBe('b');
  });

  it('are deleted without touching any cycle or today’s pick', () => {
    const s = addMeal(stateWith(['a', 'b'], 1), savedOnly('s'), zero);
    const next = deleteMeal(s, 's', zero);
    expect(next.meals.map((m) => m.id)).toEqual(['a', 'b']);
    expect(next.cycles).toEqual(s.cycles);
    expect(next.today).toEqual(s.today);
  });

  it('stay out of every cycle when edited', () => {
    const s = addMeal(stateWith(['a'], 0), savedOnly('s'), zero);
    const next = updateMeal(s, { ...savedOnly('s'), name: 'Renamed' }, zero);
    expect(next.meals.find((m) => m.id === 's')?.name).toBe('Renamed');
    expect(next.cycles).toEqual(s.cycles);
    expect(next.today).toEqual(s.today);
  });
});

describe('placeMeal', () => {
  it('moves a saved-only meal into the loop after today’s pick', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = addMeal(stateWith(['a', 'b', 'c'], 1), savedOnly('s'), zero);
      const next = placeMeal(s, 's', 'breakfast', seeded(seed));
      expect(next.cycles.breakfast.order.indexOf('s')).toBeGreaterThan(1);
      expect(currentMeal(next, 'breakfast')?.id).toBe('b');
    }
  });

  it('gives it the category and keeps its bookmark', () => {
    const s = addMeal(createEmptyState(), savedOnly('s'), zero);
    const next = placeMeal(s, 's', 'lunch', zero);
    const placed = next.meals.find((m) => m.id === 's');
    expect(placed?.category).toBe('lunch');
    expect(placed?.saved).toBe(true);
    expect(mealsIn(next, 'lunch').map((m) => m.id)).toEqual(['s']);
  });

  it('serves it at once when that list was empty', () => {
    const s = addMeal(createEmptyState(), savedOnly('s'), zero);
    expect(placeMeal(s, 's', 'lunch', zero).today.lunch.mealId).toBe('s');
  });

  // Moving between lists is updateMeal's job, and a quiet second path for it
  // would be a second set of rules.
  it('leaves a meal that already has a list where it is', () => {
    const s = stateWith(['a', 'b'], 0);
    expect(placeMeal(s, 'a', 'lunch', zero)).toEqual(s);
  });

  it('ignores an id that is not there', () => {
    const s = stateWith(['a'], 0);
    expect(placeMeal(s, 'nope', 'lunch', zero)).toEqual(s);
  });
});

describe('toggleSaved on a saved-only meal', () => {
  // Saved is the only place it is, so taking it out of Saved leaves it nowhere.
  it('deletes it', () => {
    const s = addMeal(stateWith(['a'], 0), savedOnly('s'), zero);
    const next = toggleSaved(s, 's');
    expect(next.meals.map((m) => m.id)).toEqual(['a']);
    expect(next.cycles).toEqual(s.cycles);
    expect(next.today).toEqual(s.today);
  });

  it('still only unbookmarks a meal that is in a list', () => {
    const s = toggleSaved(stateWith(['a'], 0), 'a');
    const next = toggleSaved(s, 'a');
    expect(next.meals.map((m) => m.id)).toEqual(['a']);
    expect(next.meals[0].saved).toBe(false);
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

  it('leaves the input untouched across the saved-only paths', () => {
    const s = addMeal(stateWith(['a', 'b'], 0), savedOnly('s'), zero);
    const snapshot = JSON.stringify(s);
    placeMeal(s, 's', 'lunch', zero);
    toggleSaved(s, 's');
    deleteMeal(s, 's', zero);
    updateMeal(s, { ...savedOnly('s'), name: 'Changed' }, zero);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
