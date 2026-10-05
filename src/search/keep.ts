/**
 * Turning a found recipe into a meal of your own.
 *
 * This lived inside the preview screen, where nothing could test it — and a
 * field quietly missing from the mapping is invisible until you notice, months
 * later, that the meals you kept look nothing like the ones you found. The
 * photo was exactly that field.
 */
import type { Category, Meal } from '@/domain/types';
import type { RecipeHit } from './types';

/**
 * A null category is saved only: the bookmark on a search card. Such a meal is
 * always saved, whatever keepForLater says, because Saved is the only place it
 * can be seen.
 */
export function keptAsMeal(
  hit: RecipeHit,
  category: Category | null,
  keepForLater: boolean,
): Omit<Meal, 'id'> {
  return {
    name: hit.name,
    category,
    imageUrl: hit.imageUrl,
    ingredients: hit.ingredients,
    steps: hit.steps,
    // The source doesn't publish a prep time; it stays yours to fill in.
    prepMinutes: null,
    saved: category === null || keepForLater,
  };
}

/**
 * The meal a found recipe became, or null if it is not one of your meals —
 * so its card can tell whether it is saved, and whether it is in a list.
 *
 * Recognised by its photo URL, not its name. The source gives every dish its
 * own photo and a meal you typed has none, so the URL can't match a meal that
 * merely shares a name — and it survives you renaming the meal you kept. A
 * recipe with no photo has nothing to recognise it by, and is never claimed.
 */
export function keptMealFor(hit: RecipeHit, meals: readonly Meal[]): Meal | null {
  if (!hit.imageUrl) return null;
  return meals.find((meal) => meal.imageUrl === hit.imageUrl) ?? null;
}
