/**
 * Where a meal's photo is, in the two senses of the word.
 *
 * Pure on purpose, and it takes the photos directory as an argument rather than
 * reading it from expo-file-system: that is what lets the decisions below be
 * tested without a device, and the decisions are where the quiet bugs are.
 *
 * On iOS the documents directory sits inside a container whose UUID changes when
 * the app updates, so a stored absolute file:// URI resolves today and breaks on
 * the next release with no error at all. Meals therefore hold a bare filename,
 * and the URI is composed here, at render time.
 */
import type { Meal } from '@/domain/types';

export function photoName(id: string): string {
  return `photo-${id}.jpg`;
}

/** What <Image> should be handed for this meal, or null to draw the letter. */
export function photoUriFor(meal: Meal, photosDir: string): string | null {
  if (meal.photoFile) {
    return `${photosDir.replace(/\/+$/, '')}/${meal.photoFile}`;
  }
  // Yours first, then the source's. Removing yours writes null here, and that
  // has to fall back rather than read as "no picture".
  return meal.imageUrl ?? null;
}

/** A photo you added, as opposed to one the recipe source sent. */
export function hasOwnPhoto(meal: Meal): boolean {
  return !!meal.photoFile;
}
