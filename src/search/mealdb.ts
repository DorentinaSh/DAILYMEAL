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

/** Injectable random source, so a browse can be reproduced under test. */
export type Rng = () => number;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Enough to scroll, few enough to stay one screen of intent. */
const BROWSE_SIZE = 20;

/** Some letters hold nothing at all, so a browse gets a couple of goes. */
const BROWSE_TRIES = 3;

function shuffled<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
 * Something to look at before a word is typed. Browsing by first letter is the
 * only listing the source answers with whole recipes — its category listing
 * returns names and photos alone, which would leave a tapped dish with no
 * ingredients and no method.
 */
export async function browseRecipes(rng: Rng = Math.random): Promise<RecipeHit[]> {
  for (const letter of shuffled(LETTERS, rng).slice(0, BROWSE_TRIES)) {
    const hits = await get(`${ENDPOINT}?f=${letter}`);
    if (hits.length > 0) return shuffled(hits, rng).slice(0, BROWSE_SIZE);
  }
  return [];
}
