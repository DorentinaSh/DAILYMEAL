# DAILYMEAL — Photos On Your Own Meals

**Date:** 2026-09-28
**Status:** Approved, ready for implementation planning

## Purpose

Every meal now draws a mark: a photo when it has one, its initial in the display
face when it does not. But nothing in the app can produce a photo. `imageUrl` is
only ever written by `keptAsMeal`, from a TheMealDB thumbnail, so a meal you
typed yourself can never have a face — it wears a letter forever, and no amount
of using the app changes that.

This closes the asymmetry the mark was built to close. A meal you cook is the one
you know what it looks like, and it should be the easiest one to photograph.

Note: the saved-recipes design of 2026-09-14 lists "Storing photos on `Meal`" as
out of scope, on the reasoning that meals stay text. That line is superseded
here. That document also describes a `SavedRecipe` collection and a fifth tab;
what shipped keeps `Meal.saved` and makes Saved a tab inside Meals.

## Scope

**In scope**

- Adding a photo to a meal from the camera or the photo library
- A durable copy of that photo, surviving app updates and cache eviction
- Replacing a photo, and removing one
- Deleting a meal's photo file when the meal is deleted
- A `photoFile` field on `Meal`, beside the existing `imageUrl`
- The editor control for all of the above
- `expo-image-picker` as a dependency, and its two iOS permission strings

**Out of scope**

- More than one photo per meal
- Cropping beyond the square the picker offers, filters, rotation, brightness
- Any cloud backup, sync or sharing of photos
- Photos on saved search results before they become meals
- Reading or stripping EXIF, including location
- A photo anywhere in the Search flow — those already have the source's thumbnail

## The five decisions

Recorded because the model follows from them, and each one is a trap avoided.

1. **Two fields, not one.** `imageUrl` keeps meaning exactly what it means today:
   the source's photo, remote, written once when a recipe is kept. A new
   `photoFile` holds a photo you added. Overloading one field would make every
   reader branch on the shape of a string, and would destroy a found recipe's
   original the first time you photographed your own.

2. **Your photo wins; the source's is the fallback.** A meal from Search that you
   then photograph shows your photo. Remove yours and it falls back to
   TheMealDB's rather than dropping to a letter. Nothing you did is destroyed by
   something you undid.

3. **A filename, never a path.** On iOS the documents directory sits inside a
   container whose UUID changes when the app updates. An absolute `file://` URI
   stored in state would resolve correctly today and silently break on the next
   release, with no error and no way to recover the association. `photoFile`
   holds a bare filename; the full URI is composed at render time.

4. **The durable copy happens on save, not on pick.** The picker returns a URI in
   the cache directory, which the OS may purge whenever it likes, so a photo must
   be copied before it is recorded. Copying at pick time means a file on disk for
   every edit someone abandoned. Picking holds the cache URI in component state;
   Save copies it and records the name; Cancel leaves nothing behind.

5. **Cleanup belongs to the store action.** `deleteMeal` in `cycle.ts` is a pure
   function of state, and file I/O has no business in it — the whole engine is
   testable because nothing in it touches a device. `removeMeal` in the store is
   already the impure boundary, so it deletes the file and then calls the
   reducer.

## Data model

```ts
export type Meal = {
  // …existing fields…

  /**
   * The source's photo, for a meal that arrived from search. Remote, written
   * once when the recipe is kept, never edited.
   */
  imageUrl?: string | null;

  /**
   * A photo you added, as a bare filename under the photos directory — never a
   * path. Resolved against the documents directory at render time, because that
   * directory moves between app versions on iOS.
   */
  photoFile?: string | null;
};
```

Both optional for the same reason `saved` is: meals written before the field
existed do not have it, and absent reads as none.

Persistence needs no migration. `storage.ts` is a plain JSON round trip with no
schema and no field whitelist, so a new optional field rides along.

## Where photos live

```
<documents>/meals/photo-<id>.jpg
```

`<id>` comes from the same `makeId()` the app already mints meal ids with, and
is not the meal's id. It cannot be: the copy happens on save, and a new meal has
no id until `createMeal` mints one inside the store — naming the file after the
meal would mean either two writes or moving id-minting out of the store. The meal
points at the file, so the file never needs to know the meal.

A fresh name for every save also sidesteps `expo-image`'s cache, which keys on
URI: a replacement written to the same filename would keep showing the old
picture. The directory is created on first use.

## Modules

Split so that the part which can hold a bug is the part jest can reach.

**`src/photos/paths.ts`** — pure, unit-tested. No imports from `expo-*`.

```ts
/** The filename to write a freshly picked photo under. Takes the id rather
 *  than minting one, so the result is deterministic under test. */
export function photoName(id: string): string;

/** What <Image> should be handed for this meal, or null for a letter. */
export function photoUriFor(meal: Meal, photosDir: string): string | null;

/** A meal has a photo of its own, as opposed to the source's. */
export function hasOwnPhoto(meal: Meal): boolean;
```

`photoUriFor` takes the directory as an argument rather than reading it from the
native module, which is what makes it testable. It encodes decision 2: prefer
`photoFile`, fall back to `imageUrl`, else null.

**`src/photos/files.ts`** — the I/O, using `expo-file-system`. Exports the
photos directory, `savePhoto(cacheUri)` returning the filename it wrote, and
`deletePhoto(fileName)`. Deleting a file that is already gone is not an error:
the desired state is that it does not exist. `savePhoto` mints the name with
`photoName(makeId())` and never needs to know which meal it is for.

**`src/photos/pick.ts`** — `expo-image-picker` and permissions. Exports
`takePhoto()` and `chooseFromLibrary()`, each returning a cache URI or null when
the person cancels or declines. Both request with `allowsEditing: true`,
`aspect: [1, 1]` and `quality: 0.7`: every mark is a square, and a 4MB original
is absurd for something drawn 44pt wide. A declined permission returns null and
says so on screen — it is never a thrown error, because declining is a normal
answer.

## Screens

### Meal editor

Beneath the existing name row, one control reflecting three states:

- **No photo** — `Add a photo`. Tapping offers Take photo / Choose from library
  / Cancel.
- **A pending pick, not yet saved** — the mark shows it, with `Change` and
  `Remove`. Remove here discards the pick and returns to whatever the meal had.
- **A saved photo** — same two actions. `Remove` clears `photoFile` on save and
  deletes the file; if the meal came from Search, the mark falls back to the
  source's photo.

The mark beside the name field already previews the letter as you type; it now
previews the photo the same way, so what you will get is on screen before you
commit to it.

### Everywhere else

No change. `MealMark` gains the resolved URI in place of reading `imageUrl`
directly, and Meals rows, today's card and the recipe screen all follow from
that without edits of their own.

## Lifecycle

| Event | File | State |
|---|---|---|
| Pick a photo | nothing written | cache URI in component state |
| Cancel the edit | nothing written | unchanged |
| Save with a pending pick | copied in | `photoFile` set |
| Save over an existing photo | new copied in, old deleted after | `photoFile` replaced |
| Remove, then save | old deleted | `photoFile` null |
| Delete the meal | file deleted | meal gone |
| Change a meal's category | untouched | `photoFile` carried across |

The last row matters: `updateMeal` moves a meal between rotations by deleting and
re-adding it, and the photo must survive that.

## Permissions and dependencies

`package.json` gains `expo-image-picker`, and `expo-file-system` is promoted from
a transitive dependency to a direct one, since we import it.

`app.json` gains the plugin with both strings. iOS will not build without them,
and a vague string is a rejection at review:

```json
["expo-image-picker", {
  "photosPermission": "DAILYMEAL uses your photos so a meal can show what it looks like.",
  "cameraPermission": "DAILYMEAL uses the camera so you can photograph a meal you have just cooked."
}]
```

## Testing

What jest can reach here is `paths.ts`, and it is where a mistake would be
quietest:

- `photoUriFor` prefers `photoFile` over `imageUrl`
- falls back to `imageUrl` when `photoFile` is absent or null
- returns null when a meal has neither
- composes a URI from the directory and the filename without a doubled slash
- never returns a bare filename, which would render as nothing
- `photoName` produces a `.jpg` under no directory, and passes the id through
  unchanged — the caller supplies `makeId()`, so uniqueness is already proven
  where ids are tested
- `hasOwnPhoto` is false for a meal carrying only the source's photo

`files.ts` and `pick.ts` need a device: they are thin wrappers over native
modules, and mocking `expo-file-system` would test the mock. They stay thin for
that reason — every decision worth asserting lives in `paths.ts`.

The existing contrast tests are unaffected. A photo replaces the ink tile
entirely, so no token's contrast depends on it.

## What this does not fix

A meal you typed and never photographed still wears a letter, which is correct —
the letter is a designed state, not a placeholder for a missing photo. And meals
kept from Search before `imageUrl` existed have no photo to fall back on; they
can now be given one by hand, which is the only repair available.
