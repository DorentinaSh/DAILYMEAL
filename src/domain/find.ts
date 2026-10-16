import type { Meal } from './types';

/** Lowercase with the accents taken off, so "saute" finds "Sautéed greens". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Whether a meal answers what's typed in the Meals tab's search. Each word
 * has to turn up somewhere in the name or the ingredients, so "chicken rice"
 * narrows rather than widens. Nothing typed lets every meal through.
 */
export function matchesQuery(meal: Pick<Meal, 'name' | 'ingredients'>, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const fields = [meal.name, ...meal.ingredients].map(fold);
  return words.every((word) => fields.some((field) => field.includes(word)));
}
