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
