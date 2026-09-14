# Saved Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give saved recipes their own persisted collection, tab and screens, so a recipe found in search can be kept without ever becoming a meal.

**Architecture:** A new `SavedRecipe` holds the whole recipe plus an optional `mealId` link. A pure domain module `src/domain/saved.ts` owns every rule about the collection and imports nothing but types. The cycle engine calls into it so that deleting a meal unlinks rather than deletes. A versioned store migration lifts existing bookmarks out of the `Meal.saved` flag, which is removed last, once no screen reads it.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router, zustand 5 with `persist`, expo-image, Jest (babel-jest + babel-preset-expo, `testEnvironment: node`).

**Spec:** `docs/superpowers/specs/2026-09-14-saved-recipes-design.md`

## Global Constraints

- Tests live in `src/` and end in `.test.ts` — `testMatch` is `**/src/**/*.test.ts`, so `.tsx` test files are never run. Screens are verified by hand.
- `testEnvironment` is `node`. No React rendering in tests.
- Import inside `src/` with the `@/` alias (`@/domain/types`). Files inside the same folder use a relative path (`./types`), matching `cycle.ts`.
- All colour, spacing, radius, and font values come from `@/ui/theme` — never a literal hex or px font size.
- Copy uses typographic punctuation (`’` `—` `“ ”`), matching the existing screens.
- Every file opens with a short comment saying what it is for and why, in the voice of the existing files.
- Domain functions are pure: state in, state out. Ids and random sources are passed in, never generated inside.
- `src/domain/saved.ts` must never import `./cycle`. The dependency runs one way: `cycle.ts` imports `saved.ts`.
- Verify with `npm test` and `npx tsc --noEmit` before each commit.
- `Meal.saved` stays in place until Task 10. Every task before it must leave the tree compiling and the suite green.
- Commit messages follow the repo's voice: a short imperative subject line, then a body explaining why. End every commit message with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MMKWErf5kTfHsa9AZAAHtT
```

---

### Task 1: The saved collection and its rules

The whole feature rests on this module. It is pure, it imports only types, and it never learns that a rotation exists.

**Files:**
- Modify: `src/domain/types.ts` (add `SavedRecipe`, add `saved` to `AppState`)
- Modify: `src/domain/cycle.ts` (`createEmptyState` returns an empty `saved` list)
- Create: `src/domain/saved.ts`
- Test: `src/domain/saved.test.ts`

**Interfaces:**
- Consumes: `AppState`, `Category`, `Meal` from `./types`
- Produces:
  - `type SavedRecipe`
  - `savedById(state, id: string | null): SavedRecipe | null`
  - `savedForMeal(state, mealId: string): SavedRecipe | null`
  - `savedForSource(state, sourceId: string): SavedRecipe | null`
  - `saveFromMeal(state, meal: Meal, id: string): AppState`
  - `saveFromHit(state, found, category: Category, id: string): AppState` — `found` is a structural type local to the module, satisfied by any `RecipeHit`
  - `unsave(state, savedId: string): AppState`
  - `unlinkMeal(state, mealId: string): AppState`

- [ ] **Step 1: Add the type and widen AppState**

In `src/domain/types.ts`, add above `Cycle`:

```ts
/**
 * A recipe kept for later. It holds the whole recipe rather than a pointer,
 * which is what lets a bookmark outlive the meal made from it: deleting the
 * meal nulls `mealId` and leaves the text and photo untouched.
 */
export type SavedRecipe = {
  /** Ours, not the source's. */
  id: string;
  name: string;
  imageUrl: string | null;
  ingredients: string[];
  steps: string[];
  prepMinutes: number | null;
  /** Which rotation it would join. The category picker's starting point. */
  category: Category;
  /** The source's own id, so one dish cannot be saved twice from search. */
  sourceId: string | null;
  /** Set while this recipe is also a meal in the rotation. */
  mealId: string | null;
};
```

Then add the field to `AppState`, between `meals` and `cycles`:

```ts
export type AppState = {
  meals: Meal[];
  /** Newest first. Insertion order is the list's order. */
  saved: SavedRecipe[];
  cycles: Record<Category, Cycle>;
  today: Record<Category, DayPick>;
  settings: Record<Category, CategorySettings>;
};
```

Leave `Meal.saved` exactly as it is. It comes out in Task 10.

- [ ] **Step 2: Give a new state an empty list**

In `src/domain/cycle.ts`, change the final return of `createEmptyState`:

```ts
  return { meals: [], saved: [], cycles, today, settings };
```

- [ ] **Step 3: Run the suite to see what the widened type breaks**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both. `saved` is a new required field but `createEmptyState` is the only place a whole `AppState` is built from nothing.

- [ ] **Step 4: Write the failing tests**

Create `src/domain/saved.test.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx jest src/domain/saved.test.ts`
Expected: FAIL — the suite cannot resolve `./saved`.

- [ ] **Step 6: Write the module**

Create `src/domain/saved.ts`:

```ts
/**
 * Saved recipes: the pile you keep for later.
 *
 * An entry holds the whole recipe rather than a pointer to a meal. That copy
 * is what makes the rules simple — deleting a meal nulls `mealId` and leaves
 * the recipe readable, so leaving the rotation never costs you a bookmark.
 *
 * Pure like `cycle.ts`, and deliberately importing neither it nor anything
 * React: state in, state out. Ids are handed in so a test can name them.
 */
import type { AppState, Category, Meal, SavedRecipe } from './types';

/**
 * The parts of a search result a bookmark needs. Structural on purpose: a
 * `RecipeHit` satisfies it, and the domain layer stays unaware of the search
 * layer rather than importing upward into it.
 */
type Found = {
  id: string;
  name: string;
  imageUrl: string | null;
  ingredients: string[];
  steps: string[];
};

export function savedById(state: AppState, id: string | null): SavedRecipe | null {
  if (!id) return null;
  return state.saved.find((recipe) => recipe.id === id) ?? null;
}

export function savedForMeal(state: AppState, mealId: string): SavedRecipe | null {
  return state.saved.find((recipe) => recipe.mealId === mealId) ?? null;
}

export function savedForSource(state: AppState, sourceId: string): SavedRecipe | null {
  return state.saved.find((recipe) => recipe.sourceId === sourceId) ?? null;
}

/** Bookmarks a meal already in the rotation. Meals carry no photo to copy. */
export function saveFromMeal(state: AppState, meal: Meal, id: string): AppState {
  if (savedForMeal(state, meal.id)) return state;
  const entry: SavedRecipe = {
    id,
    name: meal.name,
    imageUrl: null,
    ingredients: meal.ingredients,
    steps: meal.steps,
    prepMinutes: meal.prepMinutes,
    category: meal.category,
    sourceId: null,
    mealId: meal.id,
  };
  return { ...state, saved: [entry, ...state.saved] };
}

/**
 * Bookmarks a recipe found in search. The source doesn't publish a prep time,
 * so that stays yours to fill in if the recipe ever becomes a meal.
 */
export function saveFromHit(
  state: AppState,
  found: Found,
  category: Category,
  id: string,
): AppState {
  if (savedForSource(state, found.id)) return state;
  const entry: SavedRecipe = {
    id,
    name: found.name,
    imageUrl: found.imageUrl,
    ingredients: found.ingredients,
    steps: found.steps,
    prepMinutes: null,
    category,
    sourceId: found.id,
    mealId: null,
  };
  return { ...state, saved: [entry, ...state.saved] };
}

export function unsave(state: AppState, savedId: string): AppState {
  if (!savedById(state, savedId)) return state;
  return { ...state, saved: state.saved.filter((recipe) => recipe.id !== savedId) };
}

/**
 * Called when a meal leaves the rotation. The bookmark stays and reverts to a
 * plain saved recipe, ready to be added back.
 */
export function unlinkMeal(state: AppState, mealId: string): AppState {
  if (!savedForMeal(state, mealId)) return state;
  return {
    ...state,
    saved: state.saved.map((recipe) =>
      recipe.mealId === mealId ? { ...recipe, mealId: null } : recipe,
    ),
  };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx jest src/domain/saved.test.ts && npm test && npx tsc --noEmit`
Expected: PASS on all three.

- [ ] **Step 8: Commit**

```bash
git add src/domain/types.ts src/domain/cycle.ts src/domain/saved.ts src/domain/saved.test.ts
git commit -m "Give saved recipes a collection of their own"
```

---

### Task 2: Unlink on delete, and promote from saved

Two rules that involve both collections. They live in the cycle engine because both are transitions of the rotation.

**Files:**
- Modify: `src/domain/cycle.ts` (`deleteMeal`, plus a new `addSavedToMeals`)
- Test: `src/domain/cycle.test.ts` (two new describes)

**Interfaces:**
- Consumes: `unlinkMeal`, `savedForMeal` from `./saved`; `SavedRecipe` from `./types`
- Produces: `addSavedToMeals(state, saved: SavedRecipe, category: Category, id: string, rng?: Rng): AppState`

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/domain/cycle.test.ts`. The file already imports `addMeal`, `createEmptyState`, `deleteMeal`, `mealsIn` and defines `meal()` and `zero`; add `addSavedToMeals` to the existing import from `./cycle`, and add a new import line:

```ts
import { saveFromMeal, savedById, savedForMeal } from './saved';
```

Then append:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/domain/cycle.test.ts`
Expected: FAIL — `addSavedToMeals` is not exported, and the delete tests find an entry that was removed rather than unlinked.

- [ ] **Step 3: Make deleteMeal unlink**

In `src/domain/cycle.ts`, add to the imports at the top of the file:

```ts
import { unlinkMeal } from './saved';
```

Add to the `./types` import list: `type SavedRecipe`.

Then wrap the existing return of `deleteMeal`. It currently ends with `return syncToday({...}, category);` — change it to:

```ts
  // The bookmark outlives the meal: it reverts to a plain saved recipe rather
  // than vanishing with the rotation entry.
  return unlinkMeal(
    syncToday(
      {
        ...state,
        meals: state.meals.filter((m) => m.id !== id),
        cycles: { ...state.cycles, [category]: cycle },
      },
      category,
    ),
    id,
  );
```

- [ ] **Step 4: Add addSavedToMeals**

Append to `src/domain/cycle.ts`:

```ts
/**
 * Promotes a saved recipe into the rotation. One transition rather than two
 * calls, so there is never a moment where the meal exists and its bookmark
 * does not point at it. The chosen category is written back to the recipe, so
 * the two can never disagree.
 */
export function addSavedToMeals(
  state: AppState,
  saved: SavedRecipe,
  category: Category,
  id: string,
  rng: Rng = defaultRng,
): AppState {
  if (saved.mealId) return state;

  const meal: Meal = {
    id,
    name: saved.name,
    category,
    ingredients: saved.ingredients,
    steps: saved.steps,
    prepMinutes: saved.prepMinutes,
  };

  const next = addMeal(state, meal, rng);
  return {
    ...next,
    saved: next.saved.map((recipe) =>
      recipe.id === saved.id ? { ...recipe, mealId: id, category } : recipe,
    ),
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. All 99 existing tests plus the new ones.

- [ ] **Step 6: Commit**

```bash
git add src/domain/cycle.ts src/domain/cycle.test.ts
git commit -m "Keep a bookmark when its meal is deleted"
```

---

### Task 3: Migrate stored bookmarks

Existing installs have bookmarks as a flag on each meal. They move into the new collection on first load, and nobody loses one.

**Files:**
- Create: `src/store/migrate.ts`
- Modify: `src/store/useAppStore.ts` (persist `version`, `migrate`, and `saved` in `partialize`)
- Test: `src/store/migrate.test.ts`

**Interfaces:**
- Consumes: `AppState`, `Meal`, `SavedRecipe` from `@/domain/types`
- Produces: `STATE_VERSION` (the number `1`), `migrateState(persisted: unknown, from: number): AppState`

- [ ] **Step 1: Write the failing tests**

Create `src/store/migrate.test.ts`:

```ts
import { createEmptyState } from '@/domain/cycle';
import { migrateState, STATE_VERSION } from './migrate';

/** A document as version 0 wrote it: bookmarks as a flag on each meal. */
function legacy(meals: Array<{ id: string; name: string; saved?: boolean }>) {
  const { saved, ...rest } = createEmptyState();
  return {
    ...rest,
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      category: 'breakfast' as const,
      ingredients: ['thing'],
      steps: ['do it'],
      prepMinutes: 5,
      ...(m.saved === undefined ? {} : { saved: m.saved }),
    })),
  };
}

describe('migrateState', () => {
  it('lifts a flagged meal into a linked saved recipe', () => {
    const state = migrateState(legacy([{ id: 'a', name: 'Porridge', saved: true }]), 0);

    expect(state.saved).toHaveLength(1);
    expect(state.saved[0]).toMatchObject({
      name: 'Porridge',
      mealId: 'a',
      sourceId: null,
      imageUrl: null,
      category: 'breakfast',
    });
  });

  it('gives every migrated entry its own id', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette', saved: true },
      ]),
      0,
    );

    const ids = state.saved.map((recipe) => recipe.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('keeps the order the meals were in', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette', saved: true },
      ]),
      0,
    );

    expect(state.saved.map((recipe) => recipe.name)).toEqual(['Porridge', 'Omelette']);
  });

  it('leaves unflagged meals out of the list', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette' },
        { id: 'c', name: 'Toast', saved: false },
      ]),
      0,
    );

    expect(state.saved.map((recipe) => recipe.mealId)).toEqual(['a']);
  });

  it('strips the flag from every meal', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette', saved: false },
      ]),
      0,
    );

    for (const meal of state.meals) {
      expect(meal).not.toHaveProperty('saved');
    }
  });

  it('keeps the meals themselves', () => {
    const state = migrateState(legacy([{ id: 'a', name: 'Porridge', saved: true }]), 0);

    expect(state.meals.map((meal) => meal.id)).toEqual(['a']);
  });

  it('gives a document with no bookmarks an empty list', () => {
    const state = migrateState(legacy([{ id: 'a', name: 'Porridge' }]), 0);

    expect(state.saved).toEqual([]);
  });

  it('leaves an already-migrated document alone', () => {
    const current = { ...createEmptyState(), saved: [] };

    expect(migrateState(current, STATE_VERSION)).toBe(current);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/store/migrate.test.ts`
Expected: FAIL — the suite cannot resolve `./migrate`.

- [ ] **Step 3: Write the migration**

Create `src/store/migrate.ts`:

```ts
/**
 * Migrations for the stored document.
 *
 * Version 0 kept bookmarks as a `saved` boolean on each meal, which meant a
 * recipe could only be kept by first becoming one. Version 1 moves them into
 * their own collection. Nobody has to re-save anything.
 */
import type { AppState, Meal, SavedRecipe } from '@/domain/types';

export const STATE_VERSION = 1;

/** A version 0 meal: today's Meal plus the flag that has since moved out. */
type LegacyMeal = Meal & { saved?: boolean };

type LegacyState = Omit<AppState, 'meals' | 'saved'> & {
  meals?: LegacyMeal[];
  saved?: SavedRecipe[];
};

export function migrateState(persisted: unknown, from: number): AppState {
  if (from >= STATE_VERSION) return persisted as AppState;

  const legacy = persisted as LegacyState;
  const saved: SavedRecipe[] = [];
  const meals: Meal[] = (legacy.meals ?? []).map((stored) => {
    const { saved: wasSaved, ...meal } = stored;
    if (wasSaved) {
      saved.push({
        // Derived from the meal id rather than generated: a migration must
        // give the same answer every time it runs on the same document.
        id: `migrated-${meal.id}`,
        name: meal.name,
        // Version 0 meals carry no photo, and none can be invented.
        imageUrl: null,
        ingredients: meal.ingredients,
        steps: meal.steps,
        prepMinutes: meal.prepMinutes,
        category: meal.category,
        // Nothing recorded where an old bookmark came from, and a made-up
        // source id could collide with a real one in the duplicate check.
        sourceId: null,
        mealId: meal.id,
      });
    }
    return meal;
  });

  return { ...(legacy as unknown as AppState), meals, saved };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/store/migrate.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Wire it into the store**

In `src/store/useAppStore.ts`, add to the imports:

```ts
import { migrateState, STATE_VERSION } from './migrate';
```

In the `persist` options object, add `version` and `migrate` beside `name` and `storage`, and add `saved` to `partialize`:

```ts
    {
      name: STORAGE_KEY,
      storage: persistStorage,
      version: STATE_VERSION,
      migrate: (persisted, from) => migrateState(persisted, from),
      // Only the data is persisted; actions and the hydration flag are not.
      partialize: (s): AppState => ({
        meals: s.meals,
        saved: s.saved,
        cycles: s.cycles,
        today: s.today,
        settings: s.settings,
      }),
```

Leave `onRehydrateStorage` exactly as it is.

- [ ] **Step 6: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both.

- [ ] **Step 7: Commit**

```bash
git add src/store/migrate.ts src/store/migrate.test.ts src/store/useAppStore.ts
git commit -m "Carry existing bookmarks into the new collection"
```

---

### Task 4: Store actions

The store decides when, the domain decides what. These four actions are the only impure part: they mint ids.

**Files:**
- Modify: `src/store/useAppStore.ts`

**Interfaces:**
- Consumes: `saveFromMeal`, `saveFromHit`, `unsave`, `savedById` from `@/domain/saved`; `addSavedToMeals` from `@/domain/cycle`; `makeId` from `@/domain/cycle`
- Produces, on the store:
  - `saveRecipeFromMeal(meal: Meal) => void`
  - `saveRecipeFromHit(found: RecipeHit, category: Category) => void`
  - `unsaveRecipe(savedId: string) => void`
  - `addSavedToMeals(savedId: string, category: Category) => void`

- [ ] **Step 1: Add the imports**

In `src/store/useAppStore.ts`, add `addSavedToMeals as addSavedToMealsRule` to the existing import from `@/domain/cycle`, keeping the list alphabetical:

```ts
import {
  addMeal,
  addSavedToMeals as addSavedToMealsRule,
  createEmptyState,
  dateKey,
  deleteMeal,
  makeId,
  rollover,
  skip,
  toggleSaved,
  updateMeal,
} from '@/domain/cycle';
import { saveFromHit, saveFromMeal, savedById, unsave } from '@/domain/saved';
import type { RecipeHit } from '@/search/types';
```

Leave `toggleSaved` in place. It comes out in Task 10.

- [ ] **Step 2: Declare the actions**

In the `Actions` type, add below `toggleSaved`:

```ts
  /** Bookmarks a meal already in the rotation. */
  saveRecipeFromMeal: (meal: Meal) => void;
  /** Bookmarks a recipe found in search, before any decision about meals. */
  saveRecipeFromHit: (found: RecipeHit, category: Category) => void;
  unsaveRecipe: (savedId: string) => void;
  /** Promotes a saved recipe into the rotation and links the two. */
  addSavedToMeals: (savedId: string, category: Category) => void;
```

- [ ] **Step 3: Implement them**

In the store body, add below the `toggleSaved` action:

```ts
      saveRecipeFromMeal: (meal) => set((s) => saveFromMeal(s, meal, makeId())),

      saveRecipeFromHit: (found, category) =>
        set((s) => saveFromHit(s, found, category, makeId())),

      unsaveRecipe: (savedId) => set((s) => unsave(s, savedId)),

      addSavedToMeals: (savedId, category) =>
        set((s) => {
          const recipe = savedById(s, savedId);
          if (!recipe) return s;
          return addSavedToMealsRule(s, recipe, category, makeId());
        }),
```

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both. No new tests here — every rule these actions reach is already covered in Tasks 1 and 2, and the store itself only mints ids.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "Wire the saved collection into the store"
```

---

### Task 5: One recipe body, two screens

A found recipe and a kept one are the same thing at different moments, so they should read the same. This extracts the shared half now, before the second screen exists to duplicate it.

**Files:**
- Create: `src/ui/RecipeBody.tsx`
- Modify: `app/search/[id].tsx` (render the component, drop the four styles it replaces)

**Interfaces:**
- Produces: `RecipeBody({ ingredients, steps }: { ingredients: string[]; steps: string[] })`

- [ ] **Step 1: Write the component**

Create `src/ui/RecipeBody.tsx`:

```tsx
/**
 * Ingredients and steps, as the two uncommitted screens draw them: a recipe
 * you found and a recipe you kept are the same thing at different moments, so
 * they read the same.
 *
 * The meal detail sets its ingredients in a bordered card instead, and is
 * deliberately left out — folding all three in would mean choosing one of the
 * two treatments, which is not this component's decision to make.
 */
import { StyleSheet, Text, View } from 'react-native';

import { color, eyebrow, font, space } from './theme';

export function RecipeBody({
  ingredients,
  steps,
}: {
  ingredients: string[];
  steps: string[];
}) {
  return (
    <>
      {ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Ingredients</Text>
          {ingredients.map((line, i) => (
            <Text key={`${line}-${i}`} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {steps.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Steps</Text>
          {steps.map((step, i) => (
            <View key={`${i}-${step.slice(0, 12)}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.line}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, marginTop: space.lg },
  line: { flex: 1, fontFamily: font.body, fontSize: 15, color: color.ink, lineHeight: 22 },
  stepRow: { flexDirection: 'row', gap: space.md },
  stepNumber: {
    fontFamily: font.monoMedium,
    fontSize: 13,
    color: color.mute,
    lineHeight: 22,
    width: 18,
  },
});
```

- [ ] **Step 2: Use it in the search preview**

In `app/search/[id].tsx`, add the import:

```tsx
import { RecipeBody } from '@/ui/RecipeBody';
```

Replace both the ingredients block and the steps block — everything from `{hit.ingredients.length > 0 && (` through the closing of the steps block — with one line:

```tsx
      <RecipeBody ingredients={hit.ingredients} steps={hit.steps} />
```

Then delete the now-unused `section`, `line`, `stepRow` and `stepNumber` entries from that file's `StyleSheet.create` call.

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both. This is a pure refactor; nothing renders differently.

- [ ] **Step 4: Check it by hand**

Run the app, open Search, tap a result. The ingredients and steps must look exactly as they did before.

- [ ] **Step 5: Commit**

```bash
git add src/ui/RecipeBody.tsx "app/search/[id].tsx"
git commit -m "Pull the recipe body out of the search preview"
```

---

### Task 6: The Saved tab and its list

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (a fifth tab and its drawn glyph)
- Create: `app/(tabs)/saved.tsx`

**Interfaces:**
- Consumes: `savedById` is not needed here; the screen reads `useAppStore((s) => s.saved)`
- Produces: the route `/(tabs)/saved`, and rows that push `/saved/<id>` (that screen arrives in Task 7)

- [ ] **Step 1: Add the glyph**

In `app/(tabs)/_layout.tsx`, widen the `shape` union on `TabMark`:

```tsx
  shape: 'today' | 'search' | 'meals' | 'saved' | 'settings';
```

Add this branch directly above the final `return` of `TabMark`, which draws Settings:

```tsx
  if (shape === 'saved') {
    return (
      <View style={styles.markSaved}>
        <View style={[styles.bookmark, { backgroundColor: tint }]}>
          {/* The notch is painted in the bar behind it, as on the save button. */}
          <View style={[styles.bookmarkNotch, { borderBottomColor: color.tile }]} />
        </View>
      </View>
    );
  }
```

Add to the `StyleSheet.create` call:

```tsx
  markSaved: { height: 18, justifyContent: 'center' },
  bookmark: {
    width: 13,
    height: 17,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    justifyContent: 'flex-end',
  },
  bookmarkNotch: {
    width: 0,
    height: 0,
    borderLeftWidth: 6.5,
    borderRightWidth: 6.5,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
```

Register the tab between Meals and Settings:

```tsx
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => <TabMark shape="saved" focused={focused} />,
        }}
      />
```

- [ ] **Step 2: Write the list screen**

Create `app/(tabs)/saved.tsx`:

```tsx
/**
 * Everything kept for later, newest first — recipes found in search and never
 * added, and meals already in the rotation, in one list. Which of the two an
 * entry is shows in its meta line rather than splitting the list in two.
 */
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORY_LABEL, type SavedRecipe } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { color, font, radius, space } from '@/ui/theme';

export default function SavedScreen() {
  const saved = useAppStore((s) => s.saved);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={saved}
        keyExtractor={(recipe) => recipe.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.title}>Saved</Text>
            <Text style={styles.lede}>
              Kept for later. Nothing here is in the rotation until you add it.
            </Text>
          </View>
        }
        renderItem={({ item }) => <Row recipe={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nothing saved yet. Tap the bookmark on any recipe to keep it here.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function Row({ recipe }: { recipe: SavedRecipe }) {
  const count = recipe.ingredients.length;
  const meta = recipe.mealId
    ? `In meals  ·  ${CATEGORY_LABEL[recipe.category]}`
    : `Saved recipe  ·  ${count} ingredient${count === 1 ? '' : 's'}`;

  return (
    <Pressable
      onPress={() => router.push(`/saved/${recipe.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{recipe.name}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge },
  head: { marginBottom: space.xxl },
  title: {
    fontFamily: font.displayBold,
    fontSize: 40,
    color: color.ink,
    letterSpacing: -0.8,
  },
  lede: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
    marginTop: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    backgroundColor: color.tile,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
  },
  rowPressed: { opacity: 0.62 },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontFamily: font.bodyMedium, fontSize: 17, color: color.ink },
  rowMeta: {
    fontFamily: font.mono,
    fontSize: 11,
    color: color.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevron: { fontFamily: font.body, fontSize: 22, color: color.mute },
  empty: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.mute,
    lineHeight: 22,
  },
});
```

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both.

- [ ] **Step 4: Check it by hand**

Run the app. Five tabs, with a bookmark glyph between Meals and Settings. The Saved tab shows the empty message. Its glyph must tint ink when focused and mute when not, like its neighbours.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/_layout.tsx" "app/(tabs)/saved.tsx"
git commit -m "Give saved recipes a tab of their own"
```

---

### Task 7: The saved detail screen

**Files:**
- Create: `app/saved/[id].tsx`
- Modify: `app/_layout.tsx` (register the route on the Stack)

**Interfaces:**
- Consumes: `savedById` from `@/domain/saved`; `unsaveRecipe` and `addSavedToMeals` from the store; `RecipeBody` from Task 5

- [ ] **Step 1: Write the screen**

Create `app/saved/[id].tsx`:

```tsx
/**
 * One kept recipe. Unlinked, it offers the same pair the search preview does —
 * a category and an add button — because it is the same decision, just taken
 * later. Linked, that decision is already made, so it offers the meal instead.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { savedById } from '@/domain/saved';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { RecipeBody } from '@/ui/RecipeBody';
import { SaveButton } from '@/ui/SaveButton';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function SavedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useAppStore((s) => savedById(s, id ?? null));
  const unsaveRecipe = useAppStore((s) => s.unsaveRecipe);
  const addSavedToMeals = useAppStore((s) => s.addSavedToMeals);

  const [category, setCategory] = useState<Category>(recipe?.category ?? 'lunch');

  if (!recipe) {
    return (
      <View style={styles.gone}>
        <Text style={styles.goneText}>This recipe is no longer saved.</Text>
        <Button label="Back to saved" onPress={() => router.back()} />
      </View>
    );
  }

  function remove() {
    if (!recipe) return;
    unsaveRecipe(recipe.id);
    router.back();
  }

  function addToMeals() {
    if (!recipe) return;
    addSavedToMeals(recipe.id, category);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {recipe.imageUrl && (
        <Image
          source={recipe.imageUrl}
          style={styles.photo}
          contentFit="cover"
          transition={180}
        />
      )}

      <View style={styles.head}>
        <Text style={eyebrow}>
          {recipe.mealId ? 'In meals' : 'Saved recipe'}
        </Text>
        <SaveButton
          saved
          onPress={remove}
          accessibilityLabel="Remove from saved"
        />
      </View>
      <Text style={styles.name}>{recipe.name}</Text>

      {recipe.mealId ? (
        <Button
          label={`Open in ${CATEGORY_LABEL[recipe.category].toLowerCase()}`}
          onPress={() => router.push(`/meal/${recipe.mealId}`)}
          style={styles.action}
        />
      ) : (
        <View style={styles.pickRow}>
          {CATEGORIES.map((option) => {
            const active = option === category;
            return (
              <Pressable
                key={option}
                onPress={() => setCategory(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.pick, active && styles.pickActive]}
              >
                <Text style={[styles.pickLabel, active && styles.pickLabelActive]}>
                  {CATEGORY_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <RecipeBody ingredients={recipe.ingredients} steps={recipe.steps} />

      {!recipe.mealId && (
        <Button
          label={`Add to ${CATEGORY_LABEL[category].toLowerCase()}`}
          onPress={addToMeals}
          variant="solid"
          style={styles.add}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gone: {
    flex: 1,
    backgroundColor: color.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  goneText: { fontFamily: font.body, fontSize: 15, color: color.mute },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: color.tile,
    marginBottom: space.sm,
  },
  name: {
    fontFamily: font.displayBold,
    fontSize: 32,
    color: color.ink,
    letterSpacing: -0.6,
    marginTop: space.xs,
  },
  action: { alignSelf: 'flex-start', marginTop: space.sm },
  pickRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  pick: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
    backgroundColor: color.tile,
  },
  pickActive: { backgroundColor: color.ink, borderColor: color.ink },
  pickLabel: { fontFamily: font.bodyMedium, fontSize: 14, color: color.slate },
  pickLabelActive: { color: color.tile },
  add: { marginTop: space.xl },
});
```

Note the screen does not pop after adding to meals. The entry stays and flips to its linked form in place, which is the change the user needs to see.

- [ ] **Step 2: Register the route**

In `app/_layout.tsx`, add below the `search/[id]` screen:

```tsx
        <Stack.Screen name="saved/[id]" options={{ title: '' }} />
```

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both.

- [ ] **Step 4: Note that the hand check waits for Task 8**

Nothing in the UI can create a saved recipe yet: the search preview still banks its bookmark until a meal is created, and the meal screen still writes the old flag. Both switch over in Tasks 8 and 9. This screen is exercised by the acceptance walk-through in Task 8, Step 5. Do not hand-seed storage to check it early.

- [ ] **Step 5: Commit**

```bash
git add "app/saved/[id].tsx" app/_layout.tsx
git commit -m "Show one saved recipe on its own screen"
```

---

### Task 8: The search preview saves on tap

This is the bug the whole feature exists for. The bookmark stops being a checkbox applied later and becomes a bookmark.

**Files:**
- Modify: `app/search/[id].tsx`

**Interfaces:**
- Consumes: `savedForSource` from `@/domain/saved`; `saveRecipeFromHit`, `unsaveRecipe` from the store

- [ ] **Step 1: Replace the local flag with the collection**

In `app/search/[id].tsx`, add to the imports:

```tsx
import { savedForSource } from '@/domain/saved';
```

Replace the `keepForLater` state declaration and its comment:

```tsx
  // Decided here, applied when the meal is actually created below.
  const [keepForLater, setKeepForLater] = useState(false);
```

with reads and writes against the store:

```tsx
  // Saving is its own decision now, taken the moment the bookmark is tapped
  // rather than banked until a meal gets created.
  const savedRecipe = useAppStore((s) => (hit ? savedForSource(s, hit.id) : null));
  const saveRecipeFromHit = useAppStore((s) => s.saveRecipeFromHit);
  const unsaveRecipe = useAppStore((s) => s.unsaveRecipe);
```

The `useState` import stays: `category` still uses it.

- [ ] **Step 2: Point the bookmark at those**

Replace the `SaveButton` in the head block with:

```tsx
        <SaveButton
          saved={!!savedRecipe}
          onPress={() => {
            if (!hit) return;
            if (savedRecipe) unsaveRecipe(savedRecipe.id);
            else saveRecipeFromHit(hit, category);
          }}
          accessibilityLabel={savedRecipe ? 'Remove from saved' : 'Save for later'}
        />
```

- [ ] **Step 3: Stop passing the flag when creating the meal**

In `save()`, remove the `saved: keepForLater,` line so the call reads:

```tsx
    createMeal({
      name: hit.name,
      category,
      ingredients: hit.ingredients,
      steps: hit.steps,
      // The source doesn't publish a prep time; it stays yours to fill in.
      prepMinutes: null,
    });
```

Adding a recipe to the rotation is not itself a bookmark. The two decisions stay independent in both directions.

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both.

- [ ] **Step 5: Check it by hand — this is the acceptance test for the whole feature**

1. Search for a dish and open it. Tap the bookmark. It fills.
2. Go back twice, without adding the meal. Open the Saved tab. The recipe is there, described as a saved recipe with its ingredient count.
3. Open it. The photo, ingredients and steps are intact. Choose a category and add it to meals. The screen flips to its linked form and offers to open the meal.
4. Check the Meals tab. The meal is there.
5. Open that meal and delete it. Return to Saved. The recipe is still listed, back to being a saved recipe.
6. Find the same dish in search again. Its bookmark shows as already saved.

- [ ] **Step 6: Commit**

```bash
git add "app/search/[id].tsx"
git commit -m "Keep a found recipe the moment you tap the bookmark"
```

---

### Task 9: The meal screen and the Meals filter

**Files:**
- Modify: `app/meal/[id].tsx` (bookmark reads and writes the collection)
- Modify: `app/(tabs)/meals.tsx` (the filter and its bookmark come off)

**Interfaces:**
- Consumes: `savedForMeal` from `@/domain/saved`; `saveRecipeFromMeal`, `unsaveRecipe` from the store

- [ ] **Step 1: Switch the meal detail's bookmark**

In `app/meal/[id].tsx`, add `savedForMeal` to the imports:

```tsx
import { savedForMeal } from '@/domain/saved';
```

Replace the `toggleSaved` selector:

```tsx
  const toggleSaved = useAppStore((s) => s.toggleSaved);
```

with:

```tsx
  const savedRecipe = useAppStore((s) => (id ? savedForMeal(s, id) : null));
  const saveRecipeFromMeal = useAppStore((s) => s.saveRecipeFromMeal);
  const unsaveRecipe = useAppStore((s) => s.unsaveRecipe);
```

Replace the `SaveButton`:

```tsx
        <SaveButton
          saved={!!savedRecipe}
          onPress={() => {
            if (!meal) return;
            if (savedRecipe) unsaveRecipe(savedRecipe.id);
            else saveRecipeFromMeal(meal);
          }}
          accessibilityLabel={savedRecipe ? 'Remove from saved' : 'Save for later'}
        />
```

- [ ] **Step 2: Take the filter off the Meals screen**

In `app/(tabs)/meals.tsx`:

- Delete the `SaveButton` import, the `useState` import, the `savedOnly` state and the `savedCount` line.
- Replace the whole `titleRow` `View` with just the title:

```tsx
        <Text style={styles.title}>Meals</Text>
```

- Replace the conditional lede with the single sentence it had before the filter existed:

```tsx
        <Text style={styles.lede}>
          Everything here rotates. Each meal gets its turn before any repeats.
        </Text>
```

- Delete the `savedOnly && savedCount === 0` branch and its `emptyAll` text, keeping only the `CATEGORIES.map(...)` body that followed it.
- Inside that map, drop the `.filter((meal) => !savedOnly || meal.saved)` so it reads `const meals = mealsIn(state, category);`.
- Simplify the empty row to the one message left:

```tsx
                  <Text style={styles.emptyRow}>
                    No {CATEGORY_LABEL[category].toLowerCase()}s yet.
                  </Text>
```

- Drop the `{!savedOnly && (` wrapper around the add `Button`, leaving the button unconditional.
- Delete the now-unused `titleRow` and `emptyAll` style entries.

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both.

- [ ] **Step 4: Check it by hand**

Open a meal and tap its bookmark. It appears in the Saved tab, described as being in your meals with its category. Tap the bookmark again. It leaves Saved and the meal stays in the rotation. The Meals tab has no bookmark on its title row.

- [ ] **Step 5: Commit**

```bash
git add "app/meal/[id].tsx" "app/(tabs)/meals.tsx"
git commit -m "Point the meal bookmark at the saved collection"
```

---

### Task 10: Remove the flag

Nothing reads `Meal.saved` any more. It comes out, and the type stops carrying a field that lies.

**Files:**
- Modify: `src/domain/types.ts` (delete `saved` from `Meal`)
- Modify: `src/domain/cycle.ts` (delete `toggleSaved`)
- Modify: `src/domain/cycle.test.ts` (delete the two describes that test it)
- Modify: `src/store/useAppStore.ts` (delete the `toggleSaved` action and its import)

- [ ] **Step 1: Delete the tests first**

In `src/domain/cycle.test.ts`, delete the entire `describe('toggleSaved', ...)` block and the entire `describe('addMeal keeps the saved flag', ...)` block. Remove `toggleSaved` from the import list at the top of the file.

The behaviour those covered has moved: `src/domain/saved.test.ts` covers bookmarking a meal, and Task 2's tests cover what a bookmark does when its meal is added or deleted.

- [ ] **Step 2: Run the suite**

Run: `npm test`
Expected: PASS. Nothing is testing the flag now.

- [ ] **Step 3: Delete the field and the function**

In `src/domain/types.ts`, delete the `saved?: boolean` property from `Meal` along with its doc comment, leaving `prepMinutes` as the last field.

In `src/domain/cycle.ts`, delete the whole `toggleSaved` function and its doc comment.

In `src/store/useAppStore.ts`, remove `toggleSaved` from the `@/domain/cycle` import list, delete the `toggleSaved: (id: string) => void;` line from `Actions`, and delete the `toggleSaved:` action from the store body.

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc --noEmit`
Expected: PASS on both. A failure in `tsc` here means a screen still reads the flag; find it and route it through `savedForMeal` instead.

- [ ] **Step 5: Check the migration one last time by hand**

Install over an existing build that has bookmarked meals, or hand-write a version 0 document into storage. On first launch those meals appear in the Saved tab, linked, and the Meals tab looks normal.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/cycle.ts src/domain/cycle.test.ts src/store/useAppStore.ts
git commit -m "Drop the saved flag from Meal"
```

---

## Done when

- A recipe found in search can be kept without being added to meals, and survives leaving the app.
- The Saved tab lists kept recipes and meals together, newest first, each saying which it is.
- Adding a saved recipe to meals links the two; un-bookmarking from either place removes one entry.
- Deleting a meal leaves its saved recipe intact and unlinked.
- Existing bookmarks survive the upgrade with no action from the user.
- `npm test` and `npx tsc --noEmit` both pass.
