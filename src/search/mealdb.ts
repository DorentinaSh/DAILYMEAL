/**
 * The only file that knows TheMealDB exists. Everything above it works in
 * RecipeHit, so replacing the source rewrites this file and no screen.
 *
 * The '1' in the path is the free developer key: public, read-only, no account
 * and no secret to keep out of the bundle.
 */
import { toHits } from './normalize';
import type { RecipeHit } from './types';

const ENDPOINT = 'https://www.themealdb.com/api/json/v1/1/search.php';

/** A slow network should surrender rather than hang the results list. */
const TIMEOUT_MS = 10_000;

/** One character matches most of the catalogue; not worth a request. */
export const MIN_QUERY = 2;

/** Every failure reaches the screen as this, so it has one state to render. */
export class SearchError extends Error {}

export async function searchRecipes(query: string): Promise<RecipeHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?s=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new SearchError(`The recipe service answered ${response.status}.`);
    }
    return toHits(await response.json());
  } catch (failure) {
    if (failure instanceof SearchError) throw failure;
    throw new SearchError('Couldn’t reach the recipe service.');
  } finally {
    clearTimeout(timer);
  }
}
