/**
 * The letter a meal wears when it has no photo.
 *
 * Its own module rather than a helper inside MealMark: the edge cases are all
 * in the string handling, and this way they can be tested without a simulator.
 */

export function initialFor(name: string): string {
  // Array.from, not name[0]: an emoji or a composed letter is one glyph to a
  // reader and two code units to an index, and half a pair renders as a box.
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : '';
}
