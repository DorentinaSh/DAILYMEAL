# Recipe Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Search tab that finds real dishes online and saves them into the meal library as ordinary meals.

**Architecture:** A pure normalization layer turns TheMealDB's JSON into our `RecipeHit`; one client file owns the endpoint and is the only place the network exists; a transient zustand store holds results for the session; two screens render them. Nothing persisted changes — a saved recipe becomes a normal `Meal`.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router, zustand 5, expo-image, Jest (babel-jest + babel-preset-expo, `testEnvironment: node`).

**Spec:** `docs/superpowers/specs/2026-09-04-dailymeal-search-design.md`

## Global Constraints

- Tests live in `src/` and end in `.test.ts` — `testMatch` is `**/src/**/*.test.ts`, so `.tsx` test files are never run.
- `testEnvironment` is `node`. No React rendering in tests; screens are verified by hand on a device.
- Import inside `src/` with the `@/` alias (`@/domain/types`), matching `src/store` and `src/ui`.
- All colour, spacing, radius, and font values come from `@/ui/theme` — never a literal hex or px font size.
- Copy uses typographic punctuation (`’` `—` `“ ”`), matching the existing screens.
- Every file opens with a short comment saying what it is for and why, in the voice of the existing files.
- The `Meal` type, rotation, notifications, and every existing screen stay untouched.
- Verify with `npm test` and `npx tsc --noEmit` before each commit.

---

### Task 1: Normalization

The source's quirks all live here: twenty ingredient slots padded with blanks, instructions as one CRLF blob, `{"meals": null}` for no results, and no Lunch category. Pure functions, no network, no React.

**Files:**
- Modify: `package.json` (jest `moduleNameMapper`)
- Create: `src/search/types.ts`
- Create: `src/search/fixtures.ts`
- Create: `src/search/normalize.ts`
- Test: `src/search/normalize.test.ts`

**Interfaces:**
- Consumes: `Category` from `@/domain/types`
- Produces: `RecipeHit`, `RawMeal`, `mergeIngredients(raw)`, `splitSteps(text)`, `defaultCategory(sourceCategory)`, `toHit(raw)`, `toHits(body)`

- [ ] **Step 1: Teach jest the `@/` alias**

Metro resolves `@/*` from `tsconfig.json` paths, but jest has no mapper — which is why only `src/domain` (relative imports only) is tested today. Add to the `jest` block in `package.json`, after `testMatch`:

```json
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    },
```

- [ ] **Step 2: Confirm the existing suite still passes**

Run: `npm test`
Expected: PASS, 52 tests. If this breaks, stop — the mapper is wrong.

- [ ] **Step 3: Write the types**

Create `src/search/types.ts`:

```ts
/**
 * Search results are transient. Nothing here is persisted: a recipe you keep
 * becomes an ordinary Meal, and everything else is thrown away with the session.
 */

/** One dish from the recipe source, in our shape rather than theirs. */
export type RecipeHit = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** The source's own category — 'Breakfast', 'Seafood', 'Dessert'. */
  sourceCategory: string;
  area: string | null;
  /** '2 Bread' — measure and ingredient already merged into one line. */
  ingredients: string[];
  steps: string[];
};

/**
 * A row as TheMealDB sends it. Indexed rather than fully typed: the ingredient
 * fields are numbered `strIngredient1`…`strIngredient20`, which a literal type
 * would only make harder to read.
 */
export type RawMeal = Record<string, string | null | undefined>;
```

- [ ] **Step 4: Capture the fixtures**

Real rows pulled from the live endpoint, trimmed to the fields the app reads. Create `src/search/fixtures.ts`:

```ts
/**
 * Real responses, captured from the live endpoint and trimmed to the fields we
 * read. Tests run against these so the suite never touches the network.
 */
import type { RawMeal } from './types';

/** Breakfast, three ingredients, and the blank padding the source sends. */
export const BREAD_OMELETTE: RawMeal = {
  idMeal: '53076',
  strMeal: 'Bread omelette',
  strCategory: 'Breakfast',
  strArea: 'India',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/hqaejl1695738653.jpg',
  strInstructions: 'Make and enjoy',
  strIngredient1: 'Bread',
  strMeasure1: '2',
  strIngredient2: 'Egg',
  strMeasure2: '2',
  strIngredient3: 'Salt',
  strMeasure3: '0.5',
  // The source pads every unused slot — sometimes '', sometimes a space, sometimes null.
  strIngredient4: '',
  strMeasure4: ' ',
  strIngredient5: '   ',
  strMeasure5: '   ',
  strIngredient6: null,
  strMeasure6: null,
};

/** Not breakfast, and instructions broken by CRLF rather than newline. */
export const CHICKEN_HANDI: RawMeal = {
  idMeal: '52795',
  strMeal: 'Chicken Handi',
  strCategory: 'Chicken',
  strArea: 'Indian',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
  strInstructions:
    'Heat the oil and fry the onion until deep golden brown.\r\n' +
    'Add the garlic and sauté for a minute.\r\n' +
    '\r\n' +
    '  Return the onion to the pot and stir.  ',
  strIngredient1: 'Chicken',
  strMeasure1: '1.2 kg',
  strIngredient2: 'Onion',
  strMeasure2: '5 thinly sliced',
};
```

- [ ] **Step 5: Write the failing tests**

Create `src/search/normalize.test.ts`:

```ts
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
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm test -- src/search/normalize.test.ts`
Expected: FAIL — cannot find module `./normalize`.

- [ ] **Step 7: Write the implementation**

Create `src/search/normalize.ts`:

```ts
/**
 * Pure transforms from TheMealDB's JSON to RecipeHit. Every quirk of the source
 * lives here — twenty ingredient slots padded with blanks, instructions as one
 * CRLF blob, and a category list with no Lunch in it — so nothing above this
 * file has to know where the data came from.
 */
import type { Category } from '@/domain/types';
import type { RawMeal, RecipeHit } from './types';

/** The source spreads ingredients across twenty numbered pairs, always. */
const SLOTS = 20;

function text(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** Merges each populated ingredient/measure pair into a single line. */
export function mergeIngredients(raw: RawMeal): string[] {
  const lines: string[] = [];
  for (let i = 1; i <= SLOTS; i++) {
    const name = text(raw[`strIngredient${i}`]);
    if (!name) continue;
    const measure = text(raw[`strMeasure${i}`]);
    lines.push(measure ? `${measure} ${name}` : name);
  }
  return lines;
}

/** Instructions arrive as one blob, its steps separated by CRLF. */
export function splitSteps(instructions: string | null | undefined): string[] {
  return text(instructions)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Which category to preselect on the save screen. The source can say
 * 'Breakfast' but has no Lunch at all, so everything else is offered as lunch —
 * a starting point the user can change, never a claim about the dish.
 */
export function defaultCategory(sourceCategory: string): Category {
  return text(sourceCategory).toLowerCase() === 'breakfast' ? 'breakfast' : 'lunch';
}

export function toHit(raw: RawMeal): RecipeHit {
  return {
    id: text(raw.idMeal),
    name: text(raw.strMeal),
    imageUrl: text(raw.strMealThumb) || null,
    sourceCategory: text(raw.strCategory),
    area: text(raw.strArea) || null,
    ingredients: mergeIngredients(raw),
    steps: splitSteps(raw.strInstructions),
  };
}

/** `{"meals": null}` is how the source says it found nothing. */
export function toHits(body: { meals?: RawMeal[] | null }): RecipeHit[] {
  return (body?.meals ?? []).map(toHit).filter((hit) => hit.id !== '' && hit.name !== '');
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit`
Expected: PASS — 52 existing tests plus the new ones, and a clean typecheck.

- [ ] **Step 9: Commit**

```bash
git add package.json src/search
git commit -m "Normalize TheMealDB rows into RecipeHit"
```

---

### Task 2: The recipe client

The only file that knows TheMealDB exists. Everything above it works in `RecipeHit`, so swapping to another source rewrites this file and no screen.

**Files:**
- Create: `src/search/mealdb.ts`
- Test: `src/search/mealdb.test.ts`

**Interfaces:**
- Consumes: `toHits` from `@/search/normalize`, `RecipeHit` from `@/search/types`
- Produces: `searchRecipes(query: string): Promise<RecipeHit[]>`, `SearchError`, `MIN_QUERY: number`

- [ ] **Step 1: Write the failing tests**

Create `src/search/mealdb.test.ts`:

```ts
import { BREAD_OMELETTE } from './fixtures';
import { MIN_QUERY, SearchError, searchRecipes } from './mealdb';

const realFetch = globalThis.fetch;

/** Replaces fetch with one that always answers the same way, and records calls. */
function stubFetch(reply: () => Promise<unknown>) {
  const calls: string[] = [];
  globalThis.fetch = ((url: string) => {
    calls.push(url);
    return reply();
  }) as unknown as typeof fetch;
  return calls;
}

function ok(body: unknown) {
  return async () => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('searchRecipes', () => {
  it('asks the search endpoint for the encoded query', async () => {
    const calls = stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    await searchRecipes('bread omelette');

    expect(calls[0]).toBe(
      'https://www.themealdb.com/api/json/v1/1/search.php?s=bread%20omelette',
    );
  });

  it('returns normalized hits', async () => {
    stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    const hits = await searchRecipes('omelette');

    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe('Bread omelette');
    expect(hits[0].ingredients).toEqual(['2 Bread', '2 Egg', '0.5 Salt']);
  });

  it('returns nothing for a query too short to be worth a request', async () => {
    const calls = stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    expect(await searchRecipes('a')).toEqual([]);
    expect(await searchRecipes('   ')).toEqual([]);
    expect(calls).toHaveLength(0);
    expect(MIN_QUERY).toBe(2);
  });

  it('reads the source’s null as no results', async () => {
    stubFetch(ok({ meals: null }));

    expect(await searchRecipes('zzzqqq')).toEqual([]);
  });

  it('raises SearchError when the service answers with an error status', async () => {
    stubFetch(async () => ({ ok: false, status: 503 }) as unknown as Response);

    await expect(searchRecipes('chicken')).rejects.toBeInstanceOf(SearchError);
  });

  it('raises SearchError when the network fails', async () => {
    stubFetch(() => Promise.reject(new TypeError('Network request failed')));

    await expect(searchRecipes('chicken')).rejects.toBeInstanceOf(SearchError);
  });

  it('raises SearchError when the body is not the shape we expect', async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }) as unknown as Response);

    await expect(searchRecipes('chicken')).rejects.toBeInstanceOf(SearchError);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/search/mealdb.test.ts`
Expected: FAIL — cannot find module `./mealdb`.

- [ ] **Step 3: Write the implementation**

Create `src/search/mealdb.ts`:

```ts
/**
 * The only file that knows TheMealDB exists. Everything above it works in
 * RecipeHit, so replacing the source rewrites this file and no screen.
 *
 * The '1' in the path is the free developer key: public, read-only, no account
 * and no secret to keep out of the bundle.
 */
import { toHits } from './normalize';
import type { RecipeHit } from './types';

const ENDPOINT = 'https://www.themealdb.com/api/json/v1/1/search.php';

/** A slow network should surrender rather than hang the results list. */
const TIMEOUT_MS = 10_000;

/** One character matches most of the catalogue; not worth a request. */
export const MIN_QUERY = 2;

/** Every failure reaches the screen as this, so it has one state to render. */
export class SearchError extends Error {}

export async function searchRecipes(query: string): Promise<RecipeHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?s=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new SearchError(`The recipe service answered ${response.status}.`);
    }
    return toHits(await response.json());
  } catch (failure) {
    if (failure instanceof SearchError) throw failure;
    throw new SearchError('Couldn’t reach the recipe service.');
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit`
Expected: PASS and a clean typecheck.

- [ ] **Step 5: Verify against the live service**

The unit tests never touch the network, so confirm the real endpoint once by hand:

```bash
curl -s "https://www.themealdb.com/api/json/v1/1/search.php?s=chicken" | head -c 300
```

Expected: JSON beginning `{"meals":[{"idMeal":"...`. If this fails, the service is down — note it and continue; the code is unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/search/mealdb.ts src/search/mealdb.test.ts
git commit -m "Add the TheMealDB search client"
```

---

### Task 3: The search store

Transient session state. Deliberately not persisted: results belong to the session, and writing recipes into AsyncStorage would bloat the one JSON document the app actually cares about.

**Files:**
- Create: `src/store/useSearchStore.ts`
- Test: `src/store/useSearchStore.test.ts`

**Interfaces:**
- Consumes: `searchRecipes`, `MIN_QUERY` from `@/search/mealdb`; `RecipeHit` from `@/search/types`
- Produces: `useSearchStore` with state `{ query: string; status: 'idle' | 'loading' | 'done' | 'error'; hits: RecipeHit[] }` and actions `setQuery(query: string): void`, `run(query: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `src/store/useSearchStore.test.ts`:

```ts
import { BREAD_OMELETTE, CHICKEN_HANDI } from '@/search/fixtures';
import { useSearchStore } from './useSearchStore';

const realFetch = globalThis.fetch;

/** Each fetch parks until the test hands it a body, so ordering is ours to choose. */
let pending: Array<(body: unknown) => void>;

beforeEach(() => {
  pending = [];
  useSearchStore.setState({ query: '', status: 'idle', hits: [] });
  globalThis.fetch = (() =>
    new Promise((resolve) => {
      pending.push((body) =>
        resolve({ ok: true, status: 200, json: async () => body } as unknown as Response),
      );
    })) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('useSearchStore', () => {
  it('holds the query as it is typed', () => {
    useSearchStore.getState().setQuery('omelette');

    expect(useSearchStore.getState().query).toBe('omelette');
  });

  it('reports loading, then the hits it found', async () => {
    const done = useSearchStore.getState().run('omelette');
    expect(useSearchStore.getState().status).toBe('loading');

    pending[0]({ meals: [BREAD_OMELETTE] });
    await done;

    expect(useSearchStore.getState().status).toBe('done');
    expect(useSearchStore.getState().hits.map((hit) => hit.name)).toEqual(['Bread omelette']);
  });

  it('reports done with no hits when the source finds nothing', async () => {
    const done = useSearchStore.getState().run('zzzqqq');
    pending[0]({ meals: null });
    await done;

    expect(useSearchStore.getState().status).toBe('done');
    expect(useSearchStore.getState().hits).toEqual([]);
  });

  it('goes idle for a query too short to search', async () => {
    await useSearchStore.getState().run('a');

    expect(useSearchStore.getState().status).toBe('idle');
    expect(pending).toHaveLength(0);
  });

  it('discards a late response for a query that has been replaced', async () => {
    const first = useSearchStore.getState().run('chicken');
    const second = useSearchStore.getState().run('omelette');

    // The newer query answers first, then the abandoned one arrives late.
    pending[1]({ meals: [BREAD_OMELETTE] });
    await second;
    pending[0]({ meals: [CHICKEN_HANDI] });
    await first;

    expect(useSearchStore.getState().hits.map((hit) => hit.name)).toEqual(['Bread omelette']);
    expect(useSearchStore.getState().status).toBe('done');
  });

  it('reports an error and clears the list when the request fails', async () => {
    globalThis.fetch = (() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;

    await useSearchStore.getState().run('chicken');

    expect(useSearchStore.getState().status).toBe('error');
    expect(useSearchStore.getState().hits).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/store/useSearchStore.test.ts`
Expected: FAIL — cannot find module `./useSearchStore`.

- [ ] **Step 3: Write the implementation**

Create `src/store/useSearchStore.ts`:

```ts
/**
 * Search state for the current session only. No persist middleware on purpose:
 * results are disposable, and writing them to storage would bloat the one JSON
 * document the app actually cares about. A recipe you keep becomes a Meal in
 * the real store instead.
 */
import { create } from 'zustand';

import { MIN_QUERY, searchRecipes } from '@/search/mealdb';
import type { RecipeHit } from '@/search/types';

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

type SearchStore = {
  query: string;
  status: SearchStatus;
  hits: RecipeHit[];
  setQuery: (query: string) => void;
  run: (query: string) => Promise<void>;
};

export const useSearchStore = create<SearchStore>((set) => {
  // Typing fast means replies can land out of order. Only the newest may write.
  let latest = 0;

  return {
    query: '',
    status: 'idle',
    hits: [],

    setQuery: (query) => set({ query }),

    run: async (query) => {
      const seq = ++latest;

      if (query.trim().length < MIN_QUERY) {
        set({ status: 'idle', hits: [] });
        return;
      }

      set({ status: 'loading' });
      try {
        const hits = await searchRecipes(query);
        if (seq !== latest) return;
        set({ hits, status: 'done' });
      } catch {
        if (seq !== latest) return;
        set({ hits: [], status: 'error' });
      }
    },
  };
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit`
Expected: PASS and a clean typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/store/useSearchStore.ts src/store/useSearchStore.test.ts
git commit -m "Hold search results in a session store"
```

---

### Task 4: The Search tab

The screen and its place in the nav. No unit tests — screens are verified by hand, consistent with the rest of the app.

**Files:**
- Modify: `package.json` (adds `expo-image` via the installer)
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/search.tsx`

**Interfaces:**
- Consumes: `useSearchStore` from `@/store/useSearchStore`; `useAppStore` from `@/store/useAppStore`; `RecipeHit` from `@/search/types`; `Button` from `@/ui/Button`
- Produces: the route `/(tabs)/search`, which pushes `/search/<id>` on tap

- [ ] **Step 1: Install expo-image**

Run: `npx expo install expo-image`

This picks the version matching Expo SDK 57 rather than the newest release. It gives disk caching so repeat searches paint instantly, a real placeholder, and a fade instead of a pop.

- [ ] **Step 2: Add the Search tab and its glyph**

In `app/(tabs)/_layout.tsx`, widen the `TabMark` shape union and add the branch. Change the signature:

```tsx
function TabMark({ shape, focused }: { shape: 'today' | 'search' | 'meals' | 'settings'; focused: boolean }) {
```

Add this branch immediately after the `today` branch, before the `meals` branch:

```tsx
  if (shape === 'search') {
    return (
      <View style={styles.markSearch}>
        <View style={[styles.ring, { borderColor: tint }]} />
        <View style={[styles.handle, { backgroundColor: tint }]} />
      </View>
    );
  }
```

Add the new `Tabs.Screen` between `index` and `meals`, so Search sits second:

```tsx
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabMark shape="search" focused={focused} />,
        }}
      />
```

Add these three entries to the `StyleSheet.create` block at the bottom:

```tsx
  markSearch: { flexDirection: 'row', alignItems: 'flex-end', height: 18 },
  ring: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 2 },
  handle: {
    width: 3,
    height: 7,
    borderRadius: 1.5,
    marginLeft: -2,
    marginBottom: 1,
    transform: [{ rotate: '-45deg' }],
  },
```

- [ ] **Step 3: Write the screen**

Create `app/(tabs)/search.tsx`:

```tsx
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RecipeHit } from '@/search/types';
import { useAppStore } from '@/store/useAppStore';
import { useSearchStore, type SearchStatus } from '@/store/useSearchStore';
import { Button } from '@/ui/Button';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

/** Long enough that a word is finished, short enough to feel immediate. */
const DEBOUNCE_MS = 350;

export default function SearchScreen() {
  const query = useSearchStore((s) => s.query);
  const status = useSearchStore((s) => s.status);
  const hits = useSearchStore((s) => s.hits);
  const setQuery = useSearchStore((s) => s.setQuery);
  const run = useSearchStore((s) => s.run);

  // Selecting the array and deriving here: a selector that built the Set would
  // return a new object every render and never settle.
  const meals = useAppStore((s) => s.meals);
  const savedNames = useMemo(
    () => new Set(meals.map((meal) => meal.name.trim().toLowerCase())),
    [meals],
  );

  useEffect(() => {
    const timer = setTimeout(() => void run(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, run]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.lede}>
          Find a dish and keep it — it joins the rotation like anything you typed
          yourself.
        </Text>

        <View style={styles.field}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Chicken, eggs, pasta…"
            placeholderTextColor={color.mute}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search recipes"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clear}>×</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={hits}
        keyExtractor={(hit) => hit.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <ResultCard hit={item} saved={savedNames.has(item.name.trim().toLowerCase())} />
        )}
        ListEmptyComponent={
          <Empty status={status} query={query} onRetry={() => void run(query)} />
        }
      />
    </SafeAreaView>
  );
}

function ResultCard({ hit, saved }: { hit: RecipeHit; saved: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/search/${hit.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {hit.imageUrl ? (
        <Image
          source={hit.imageUrl}
          style={styles.thumb}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbBlank]}>
          <Text style={styles.thumbLetter}>{hit.name.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.cardText}>
        <Text style={styles.cardName} numberOfLines={2}>
          {hit.name}
        </Text>
        <Text style={styles.cardMeta}>
          {[hit.sourceCategory, hit.area].filter(Boolean).join('  ·  ')}
        </Text>
      </View>

      {saved ? <Text style={styles.added}>Added</Text> : <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

function Empty({
  status,
  query,
  onRetry,
}: {
  status: SearchStatus;
  query: string;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return <ActivityIndicator color={color.ink} style={styles.spinner} />;
  }

  if (status === 'error') {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Couldn’t reach the recipe service. Check your connection and try again.
        </Text>
        <Button label="Try again" onPress={onRetry} style={styles.retry} />
      </View>
    );
  }

  if (status === 'done') {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Nothing found for “{query.trim()}”. The recipe catalogue is small — try a
          plainer word like “chicken” or “rice”.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Search for a dish to add it to your meals.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  head: { paddingHorizontal: space.xl, paddingTop: space.xl },
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    paddingHorizontal: space.lg,
    height: 48,
    backgroundColor: color.tile,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
  },
  input: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 16,
    color: color.ink,
    padding: 0,
  },
  clear: { fontFamily: font.body, fontSize: 22, color: color.mute, lineHeight: 24 },
  list: { padding: space.xl, paddingTop: space.lg, paddingBottom: space.huge },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    backgroundColor: color.tile,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
  },
  cardPressed: { opacity: 0.62 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: color.porcelain },
  thumbBlank: { alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { fontFamily: font.displayBold, fontSize: 24, color: color.mute },
  cardText: { flex: 1, gap: space.xs },
  cardName: { fontFamily: font.bodyMedium, fontSize: 16, color: color.ink },
  cardMeta: { ...eyebrow, fontSize: 10 },
  chevron: { fontFamily: font.body, fontSize: 22, color: color.mute },
  added: { ...eyebrow, color: color.yolk },
  spinner: { marginTop: space.xxl },
  empty: { marginTop: space.lg, gap: space.lg },
  emptyText: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.mute,
    lineHeight: 22,
  },
  retry: { alignSelf: 'flex-start' },
});
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit && npm test`
Expected: clean, and the existing suites still pass.

- [ ] **Step 5: Verify on a device**

Run: `npx expo start`

Check, in order: the Search tab is second in the bar with a magnifier glyph; the idle line shows before typing; typing `chi` loads and then lists cards with photos; `zzzqqq` gives the small-catalogue message; airplane mode gives the retry state and the button recovers; the clear × empties the field and returns to idle.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json "app/(tabs)/_layout.tsx" "app/(tabs)/search.tsx"
git commit -m "Add the Search tab"
```

---

### Task 5: Preview and save

Tapping a result opens the full recipe with no second request — `search.php` already returned everything — and saving it calls the existing `createMeal`.

**Files:**
- Modify: `app/_layout.tsx`
- Create: `app/search/[id].tsx`

**Interfaces:**
- Consumes: `useSearchStore` (`hits`), `useAppStore` (`createMeal`), `defaultCategory` from `@/search/normalize`, `CATEGORIES` and `CATEGORY_LABEL` from `@/domain/types`
- Produces: the route `/search/[id]`

- [ ] **Step 1: Register the route**

In `app/_layout.tsx`, add this `Stack.Screen` after the `meal/edit` entry:

```tsx
        <Stack.Screen name="search/[id]" options={{ title: '' }} />
```

- [ ] **Step 2: Write the screen**

Create `app/search/[id].tsx`:

```tsx
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { defaultCategory } from '@/search/normalize';
import { useAppStore } from '@/store/useAppStore';
import { useSearchStore } from '@/store/useSearchStore';
import { Button } from '@/ui/Button';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function RecipePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // The list already fetched the whole recipe, so opening it costs no request.
  const hit = useSearchStore((s) => s.hits.find((candidate) => candidate.id === id) ?? null);
  const createMeal = useAppStore((s) => s.createMeal);

  const [category, setCategory] = useState<Category>(
    hit ? defaultCategory(hit.sourceCategory) : 'lunch',
  );

  if (!hit) {
    return (
      <View style={styles.gone}>
        <Text style={styles.goneText}>This recipe is no longer loaded.</Text>
        <Button label="Back to search" onPress={() => router.back()} />
      </View>
    );
  }

  function save() {
    if (!hit) return;
    createMeal({
      name: hit.name,
      category,
      ingredients: hit.ingredients,
      steps: hit.steps,
      // The source doesn't publish a prep time; it stays yours to fill in.
      prepMinutes: null,
    });
    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {hit.imageUrl && (
        <Image source={hit.imageUrl} style={styles.photo} contentFit="cover" transition={180} />
      )}

      <Text style={eyebrow}>{[hit.sourceCategory, hit.area].filter(Boolean).join('  ·  ')}</Text>
      <Text style={styles.name}>{hit.name}</Text>

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

      {hit.ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Ingredients</Text>
          {hit.ingredients.map((line, i) => (
            <Text key={`${line}-${i}`} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {hit.steps.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Steps</Text>
          {hit.steps.map((step, i) => (
            <View key={`${i}-${step.slice(0, 12)}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.line}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      <Button
        label={`Add to ${CATEGORY_LABEL[category].toLowerCase()}`}
        onPress={save}
        variant="solid"
        style={styles.save}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge, gap: space.md },
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
  save: { marginTop: space.xl },
});
```

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: clean typecheck, all suites pass.

- [ ] **Step 4: Verify the whole path on a device**

Run: `npx expo start`

Search `omelette`, tap a result: the photo, category, ingredients, and steps appear with no loading pause. A dish the source calls Breakfast opens with Breakfast preselected; a Seafood dish opens with Lunch. Change the choice, tap Add — you land back on the results and that row reads **Added**. Open the Meals tab: the dish is in the right section with its ingredients and steps. Open Today and confirm the rotation still behaves.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx "app/search/[id].tsx"
git commit -m "Preview a found recipe and save it as a meal"
```
