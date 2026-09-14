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
