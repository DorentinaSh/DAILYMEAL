/**
 * The colour a meal's mark wears when it has no photo.
 *
 * Taken from the name rather than the id, for a practical reason: the editor
 * previews the mark while you are still typing, before the meal has an id, and
 * the colour shown there has to be the colour you end up with. The cost is that
 * renaming a meal recolours it, which is a fair trade for a preview that does
 * not lie.
 */
import { GLAZES } from './theme';

export function glazeFor(name: string): string {
  const key = name.trim().toLowerCase();

  // FNV-1a, written out rather than pulled from a library: this has to return
  // the same answer in every future version of the app, or meals silently
  // change colour when someone updates.
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Then murmur3's finalizer. Without it the modulo reads FNV's low bits, which
  // are weakly mixed: six realistic breakfast names landed on two colours, four
  // of them the same. Measured, not assumed.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return GLAZES[(hash >>> 0) % GLAZES.length];
}
