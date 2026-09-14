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

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * The catalogue, held for the session. This is what makes 26 requests
 * affordable: clearing the field comes back to a list already in hand. Only a
 * complete answer is kept, so a letter lost to a dropped connection is asked
 * for again rather than leaving a hole for as long as the app is open.
 */
let catalogue: RecipeHit[] | null = null;

async function get(url: string): Promise<RecipeHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
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

export async function searchRecipes(query: string): Promise<RecipeHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY) return [];
  return get(`${ENDPOINT}?s=${encodeURIComponent(trimmed)}`);
}

/**
 * Everything the source holds, in the order it hands it over. Browsing by
 * first letter is the only listing that answers with whole recipes — the
 * category listing returns names and photos alone, which would leave a tapped
 * dish with no ingredients and no method. So the alphabet is asked for at
 * once, A through Z, and nothing is sorted or sampled on the way out.
 *
 * A letter that fails costs its own recipes and no more. One dropped request
 * blanking a screen of three hundred dishes would be the worse trade.
 */
export async function browseRecipes(): Promise<RecipeHit[]> {
  if (catalogue) return catalogue;

  const answers = await Promise.allSettled(
    LETTERS.map((letter) => get(`${ENDPOINT}?f=${letter}`)),
  );
  const answered = answers.filter(
    (answer): answer is PromiseFulfilledResult<RecipeHit[]> =>
      answer.status === 'fulfilled',
  );
  if (answered.length === 0) {
    throw new SearchError('Couldn’t reach the recipe service.');
  }

  const hits = answered.flatMap((answer) => answer.value);
  if (answered.length === LETTERS.length) catalogue = hits;
  return hits;
}
