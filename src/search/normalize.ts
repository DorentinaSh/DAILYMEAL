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
