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

export function keptAsMeal(
  hit: RecipeHit,
  category: Category,
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
    saved: keepForLater,
  };
}

/**
 * Whether a found recipe is already one of your meals, so its card can show a
 * tick instead of offering to add it again.
 *
 * Recognised by its photo URL, not its name. The source gives every dish its
 * own photo and a meal you typed has none, so the URL can't match a meal that
 * merely shares a name — and it survives you renaming the meal you kept. A
 * recipe with no photo has nothing to recognise it by, and is never claimed.
 */
export function isKept(hit: RecipeHit, meals: readonly Meal[]): boolean {
  if (!hit.imageUrl) return false;
  return meals.some((meal) => meal.imageUrl === hit.imageUrl);
}
