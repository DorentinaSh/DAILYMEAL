/**
 * Search results are transient. Nothing in this file is persisted: a hit
 * lives in the search store only for the length of the session. Keeping one
 * copies it out — into a SavedRecipe, with its photo, ingredients and steps,
 * or into a Meal once it joins the rotation — and either copy outlives the
 * hit it came from.
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
