/**
 * The rotation engine.
 *
 * Every function here is pure: give it a state (and a date, or a random
 * source) and it returns a new state. Nothing in this file touches React,
 * storage, or the Expo SDK, which is what makes the rules below testable
 * without a simulator.
 */
import {
  CATEGORIES,
  DEFAULT_TIMES,
  type AppState,
  type Category,
  type Cycle,
  type Meal,
} from './types';

/** Injectable random source so shuffles are reproducible under test. */
export type Rng = () => number;

const defaultRng: Rng = Math.random;

/** 'YYYY-MM-DD' in device local time — never UTC, or the day flips at night. */
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shuffle(ids: string[], rng: Rng): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Opens a fresh loop. `avoidFirst` is the meal just served: it must not land
 * first, or it would be served on two consecutive days. With a single meal
 * there is no alternative, so the guard is skipped.
 */
function newCycle(ids: string[], rng: Rng, avoidFirst?: string | null): Cycle {
  const order = shuffle(ids, rng);
  if (order.length > 1 && avoidFirst && order[0] === avoidFirst) {
    const swapWith = 1 + Math.floor(rng() * (order.length - 1));
    [order[0], order[swapWith]] = [order[swapWith], order[0]];
  }
  return { order, position: 0 };
}

export function createEmptyState(now: Date = new Date()): AppState {
  const key = dateKey(now);
  const cycles = {} as Record<Category, Cycle>;
  const today = {} as AppState['today'];
  const settings = {} as AppState['settings'];
  for (const c of CATEGORIES) {
    cycles[c] = { order: [], position: 0 };
    today[c] = { date: key, mealId: null, skippedToday: [] };
    settings[c] = { notify: false, time: DEFAULT_TIMES[c] };
  }
  return { meals: [], cycles, today, settings };
}

export function mealsIn(state: AppState, category: Category): Meal[] {
  return state.meals.filter((m) => m.category === category);
}

export function mealById(state: AppState, id: string | null): Meal | null {
  if (!id) return null;
  return state.meals.find((m) => m.id === id) ?? null;
}

export function currentMeal(state: AppState, category: Category): Meal | null {
  const { order, position } = state.cycles[category];
  return mealById(state, order[position] ?? null);
}

/** Keeps the stored pick in step with the cycle after any mutation. */
function syncToday(state: AppState, category: Category): AppState {
  const { order, position } = state.cycles[category];
  const mealId = order[position] ?? null;
  if (state.today[category].mealId === mealId) return state;
  return {
    ...state,
    today: {
      ...state.today,
      [category]: { ...state.today[category], mealId },
    },
  };
}

/**
 * A skip is only offered while some meal remains that has not already been
 * rejected today — otherwise it would hand back something already turned down.
 */
export function canSkip(state: AppState, category: Category): boolean {
  const count = mealsIn(state, category).length;
  return count > 1 && state.today[category].skippedToday.length < count - 1;
}

/**
 * Called on every app launch. If the stored date is stale the cycle advances
 * by exactly one meal — no matter how many days elapsed, or whether the clock
 * moved backwards.
 */
export function rollover(
  state: AppState,
  key: string,
  rng: Rng = defaultRng,
): AppState {
  let next = state;
  for (const category of CATEGORIES) {
    if (next.today[category].date === key) {
      next = syncToday(next, category);
      continue;
    }

    const { order, position } = next.cycles[category];
    let cycle: Cycle;
    if (position + 1 >= order.length) {
      // The loop is finished; open a new one, not repeating today's meal.
      cycle = newCycle(order, rng, order[order.length - 1] ?? null);
    } else {
      cycle = { order, position: position + 1 };
    }

    next = {
      ...next,
      cycles: { ...next.cycles, [category]: cycle },
      today: {
        ...next.today,
        [category]: {
          date: key,
          mealId: cycle.order[cycle.position] ?? null,
          skippedToday: [],
        },
      },
    };
  }
  return next;
}

/**
 * Instant re-roll: the rejected meal drops to the back of the loop and the
 * next one is served straight away, without advancing the day.
 */
export function skip(
  state: AppState,
  category: Category,
  rng: Rng = defaultRng,
): AppState {
  if (!canSkip(state, category)) return state;

  const { order, position } = state.cycles[category];
  const skipped = order[position];
  if (!skipped) return state;

  const rest = order.filter((_, i) => i !== position);

  // Dropping the last meal of a loop would re-serve it at the same index, so
  // that case opens a new loop with the rejected meal parked at the back.
  let cycle: Cycle;
  if (position >= rest.length) {
    const fresh = newCycle(rest, rng);
    cycle = { order: [...fresh.order, skipped], position: 0 };
  } else {
    cycle = { order: [...rest, skipped], position };
  }

  return syncToday(
    {
      ...state,
      cycles: { ...state.cycles, [category]: cycle },
      today: {
        ...state.today,
        [category]: {
          ...state.today[category],
          skippedToday: [...state.today[category].skippedToday, skipped],
        },
      },
    },
    category,
  );
}

/**
 * New meals join the loop already in progress, at a random spot after the
 * meal being served, so something just entered shows up within days rather
 * than waiting out a whole cycle.
 */
export function addMeal(
  state: AppState,
  meal: Meal,
  rng: Rng = defaultRng,
): AppState {
  const category = meal.category;
  // Saved only: no loop to join and no day to move, and always saved, since
  // Saved is the only place it can be seen.
  if (category === null) {
    return { ...state, meals: [...state.meals, { ...meal, saved: true }] };
  }

  const { order, position } = state.cycles[category];
  let cycle: Cycle;
  if (order.length === 0) {
    cycle = { order: [meal.id], position: 0 };
  } else {
    const span = order.length - position;
    const at = position + 1 + Math.floor(rng() * span);
    const next = [...order];
    next.splice(at, 0, meal.id);
    cycle = { order: next, position };
  }

  return syncToday(
    {
      ...state,
      meals: [...state.meals, meal],
      cycles: { ...state.cycles, [category]: cycle },
    },
    category,
  );
}

export function deleteMeal(
  state: AppState,
  id: string,
  rng: Rng = defaultRng,
): AppState {
  const meal = mealById(state, id);
  if (!meal) return state;

  const category = meal.category;
  // Saved only: it was in no loop, so there is nothing to take it out of.
  if (category === null) {
    return { ...state, meals: state.meals.filter((m) => m.id !== id) };
  }

  const { order, position } = state.cycles[category];
  const removedAt = order.indexOf(id);
  const rest = order.filter((mealId) => mealId !== id);

  // Deleting something earlier in the loop must not shift which meal is
  // served; deleting the served meal lets the next one slide into its place.
  let nextPosition = removedAt >= 0 && removedAt < position ? position - 1 : position;
  let cycle: Cycle;
  if (rest.length === 0) {
    cycle = { order: [], position: 0 };
  } else if (nextPosition >= rest.length) {
    cycle = newCycle(rest, rng);
  } else {
    cycle = { order: rest, position: nextPosition };
  }

  return syncToday(
    {
      ...state,
      meals: state.meals.filter((m) => m.id !== id),
      cycles: { ...state.cycles, [category]: cycle },
    },
    category,
  );
}

/**
 * Keeps a meal for later, or stops keeping it. Deliberately not routed through
 * updateMeal: that path calls syncToday and re-derives the day's pick, and
 * bookmarking a dish has no business moving what you're eating.
 *
 * A saved-only meal is the exception: Saved is the only place it is, so taking
 * it out of Saved deletes it rather than leaving it in no list at all.
 */
export function toggleSaved(state: AppState, id: string): AppState {
  const meal = mealById(state, id);
  if (!meal) return state;
  if (meal.category === null) return deleteMeal(state, id);
  return {
    ...state,
    meals: state.meals.map((m) => (m.id === id ? { ...m, saved: !m.saved } : m)),
  };
}

export function updateMeal(
  state: AppState,
  meal: Meal,
  rng: Rng = defaultRng,
): AppState {
  const existing = mealById(state, meal.id);
  if (!existing) return state;

  if (existing.category === meal.category) {
    const edited = {
      ...state,
      meals: state.meals.map((m) => (m.id === meal.id ? meal : m)),
    };
    // Saved only: in no loop, so there is no day to keep in step.
    return meal.category === null ? edited : syncToday(edited, meal.category);
  }

  // A category change is a move between two loops — or into or out of none,
  // which addMeal and deleteMeal both understand.
  return addMeal(deleteMeal(state, meal.id, rng), meal, rng);
}

/**
 * Moves a saved-only meal into a list. It joins the loop exactly as a new meal
 * does, at a random spot after today's pick, and keeps its bookmark. A meal
 * that already has a list is left where it is: moving between lists is
 * updateMeal's job, and a second path for it would be a second set of rules.
 */
export function placeMeal(
  state: AppState,
  id: string,
  category: Category,
  rng: Rng = defaultRng,
): AppState {
  const meal = mealById(state, id);
  if (!meal || meal.category !== null) return state;
  const without = { ...state, meals: state.meals.filter((m) => m.id !== id) };
  return addMeal(without, { ...meal, category }, rng);
}
