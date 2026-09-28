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
