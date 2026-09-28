/**
 * The photo files themselves.
 *
 * Kept deliberately thin: everything worth asserting lives in paths.ts, because
 * mocking expo-file-system here would only ever test the mock. If logic starts
 * accumulating in this file, it belongs next door.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { makeId } from '@/domain/cycle';
import type { Meal } from '@/domain/types';
import { photoName, photoUriFor } from './paths';

const DIR_NAME = 'meals';

function photosDirectory(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** The directory photos live in, as a URI. */
export function photosDir(): string {
  return new Directory(Paths.document, DIR_NAME).uri;
}

/** What to hand <Image> for this meal, or null to draw its letter instead. */
export function photoUri(meal: Meal): string | null {
  return photoUriFor(meal, photosDir());
}

/**
 * Copies a freshly picked photo out of the cache, where the system may delete
 * it at any moment, and into the documents directory. Returns the bare filename
 * to record on the meal — never the path, see paths.ts.
 *
 * A new name every time: expo-image caches by URI, so writing a replacement to
 * the same name would keep showing the old picture.
 */
export function savePhoto(cacheUri: string): string {
  const name = photoName(makeId());
  new File(cacheUri).copy(new File(photosDirectory(), name));
  return name;
}

/**
 * Removes a photo. A file that is already gone is not an error — the wanted end
 * state is that it does not exist, and a throw here would block deleting the
 * meal that points at it.
 */
export function deletePhoto(fileName: string | null | undefined): void {
  if (!fileName) return;
  try {
    const file = new File(photosDirectory(), fileName);
    if (file.exists) file.delete();
  } catch {
    // Losing a photo file is not worth failing the action that triggered it.
  }
}
