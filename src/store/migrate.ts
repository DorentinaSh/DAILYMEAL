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
