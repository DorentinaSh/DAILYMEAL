# DAILYMEAL — Saved Recipes

**Date:** 2026-09-14
**Status:** Approved, ready for implementation planning

## Purpose

A recipe you find in search and want to keep can only survive by becoming a meal.
The bookmark on the search preview is not a bookmark at all: it is a checkbox that
sets a flag on a meal you are about to create. Tap it and walk away without adding
the meal, and the recipe is gone with the session.

That is the wrong shape for the thing people actually want, which is Watch Later.
Saving should be a decision you can make on its own, before and independently of
any decision about the rotation. This design gives saved recipes their own
collection, their own tab, and their own screens, and leaves the rotation engine
untouched.

## Scope

**In scope**

- A `SavedRecipe` collection in `AppState`, persisted alongside meals
- Removing the `saved` flag from `Meal`, with a migration that loses no bookmark
- A fifth tab, `Saved`, sitting between Meals and Settings
- A Saved list screen and a Saved detail screen
- Saving immediately from the search preview, rather than at meal-creation time
- Linking a saved recipe to the meal made from it, and unlinking on delete
- Adding a saved recipe to the rotation from its own screen

**Out of scope**

- Folders, tags, or ordering controls on the Saved list
- Editing a saved recipe's text; it is a copy of what the source sent
- Storing photos on `Meal` — meals stay text, saved recipes carry a photo URL
- Any change to the cycle, notifications, or how meals rotate
- Syncing or sharing a saved list

## The four decisions

Recorded because the model follows from them and a later reader will want the why.

1. **Saved holds both kinds.** Bookmarking anything puts it in one list: a recipe
   found in search and never added, and a meal already in the rotation. There is
   one bookmark concept in the app, not two.
2. **Saved lives in its own tab.** The bookmark on the Meals title row filtered
   that list in place. It is replaced by a tab, so the saved list is one tap from
   anywhere and is a view rather than a filter.
3. **Adding to meals keeps the saved entry, linked.** The entry stays and starts
   reporting that it is in your meals. Un-bookmarking from either the meal screen
   or the saved screen removes the same single entry. Nothing is duplicated.
4. **Deleting a meal keeps the saved entry, unlinked.** The recipe reverts to a
   plain saved recipe, text and photo intact, ready to be added back. Leaving the
   rotation never costs you a recipe you bookmarked.

## Data model

```ts
export type SavedRecipe = {
  /** Ours, not the source's. */
  id: string;
  name: string;
  imageUrl: string | null;
  ingredients: string[];
  steps: string[];
  prepMinutes: number | null;
  /** Which rotation it would join. The category picker's starting point. */
  category: Category;
  /** The source's own id, so one dish cannot be saved twice from search. */
  sourceId: string | null;
  /** Set while this recipe is also a meal in the rotation. */
  mealId: string | null;
};
```

`AppState` gains `saved: SavedRecipe[]`. `Meal` loses `saved?: boolean`.

The array's order is the list's order, newest first, so entries are prepended and
no timestamp is stored. Nothing in the app sorts saved recipes by anything else,
and a field nobody reads is a field that goes stale.

### Why the recipe is copied rather than referenced

A linked entry repeats the name, ingredients and steps that its meal already
holds. That duplication is deliberate: it is what makes decision 4 free. A saved
entry is readable on its own, never chases a link, and survives the deletion of
the meal without a conversion step. The alternative — an entry that is either a
pointer or an inline recipe — avoids the copy but makes every screen branch on
which kind it received, and makes deletion a data transformation rather than
nulling a field.

Two fields differ between the two shapes and both are wanted. A saved recipe
carries `imageUrl`, which `Meal` has no field for, so a recipe saved from search
keeps its photo even once it joins the rotation. A saved recipe carries
`sourceId`, which is how the same dish is recognised on a second visit to search.

## Domain module

A new pure module, `src/domain/saved.ts`, beside the rotation engine and following
its rules: every function takes a state and returns a new one, and nothing touches
React, storage, or the Expo SDK.

| Function | Behaviour |
|---|---|
| `saveFromMeal(state, meal)` | Copies a meal into a new entry with `mealId` set and `sourceId` null. No-op if that meal is already saved. |
| `saveFromHit(state, hit, category)` | Copies a search result into a new entry with `sourceId` set and `mealId` null. No-op if that source id is already saved. |
| `unsave(state, savedId)` | Removes one entry. No-op if it is not there. |
| `unlinkMeal(state, mealId)` | Nulls `mealId` on any entry pointing at that meal. Removes nothing. |
| `savedForMeal(state, mealId)` | The entry linked to that meal, or null. |
| `savedForSource(state, sourceId)` | The entry saved from that source id, or null. |

It imports `types.ts` and the search `RecipeHit` type, and never imports the cycle
engine, so the dependency runs one way and cannot become a cycle.

`saveFromMeal` takes the `Meal` object rather than an id precisely to keep that
direction: looking a meal up by id would mean importing `mealById` from the cycle
engine, which imports this module.

## Changes to the cycle engine

`deleteMeal` calls `unlinkMeal` itself rather than leaving it to the store. The
invariant that a deleted meal leaves no dangling link then has one home, covered
by tests that already exist for that function. This is the only direction in which
the two modules are coupled: `cycle.ts` imports `saved.ts`.

A new function, `addSavedToMeals(state, saved, category, id, rng)`, creates the
meal from a saved recipe, adds it to the rotation, and sets the link, in one
transition. Splitting it into two store calls would leave a moment in which the
meal exists and its bookmark does not, and would put a rule outside the domain
layer where every other rule lives.

`toggleSaved` is deleted. It existed only to flip the flag on `Meal`.

## Migration

The persist layer currently stores an unversioned document. It gains version 1 and
a migration function, exported from `src/store/migrate.ts` as a plain function of
the stored document, so it can be tested without a store or a simulator.

The migration lifts every meal with `saved === true` into a `SavedRecipe` linked to
that meal, then deletes the flag from every meal. The resulting list holds those
entries in the same order the meals hold them, since the original flag recorded no
order to preserve and meal order is the only one available. A document with no
saved meals gains an empty array and nothing else. Nobody loses a bookmark, and
nobody has to re-save anything.

Migrated entries have a null `sourceId`. A meal saved before this change has no
record of where it came from, and inventing one would risk colliding with a real
source id in the no-duplicate check.

## Screens

### Saved tab

A fifth `Tabs.Screen` between Meals and Settings. Its icon is a drawn bookmark, in
the same idiom as the four existing tab marks: `View`s rather than an icon set,
which is not installed, tinted ink when focused and mute when not.

### Saved list

Every entry, newest first. Each row carries the recipe's name and a meta line that
reads either as being in your meals with its category, or as a saved recipe with
its ingredient count. The row opens the detail screen. Empty, it says that nothing
is saved yet and that the bookmark on any recipe puts it here.

### Saved detail

Photo, name, ingredients and steps, with a filled bookmark that removes the entry
and returns to the list.

A linked entry offers a button that opens its meal, and no category picker: the
category is already decided and changing it belongs on the meal's own editor. An
unlinked entry offers the category picker and an add button, the same pair the
search preview uses, because it is the same decision.

Removing a linked entry removes the bookmark only. The meal stays in the rotation,
exactly as un-bookmarking from the meal's own screen does today.

### Search preview

The bookmark saves on tap instead of setting local state applied later. It reads
its filled or empty state from `savedForSource`, so a dish already saved shows as
saved when you find it again, and tapping it again removes it.

The add button still creates the meal. When an entry for that source id exists, the
new meal is linked to it rather than a second entry being created. When none
exists, the meal is created unsaved: adding to the rotation is not itself a
bookmark, and the two decisions stay independent in both directions.

### Meal detail

The bookmark reads `savedForMeal` and writes through `saveFromMeal` and `unsave`.
Nothing else on the screen changes.

### Meals

The bookmark and its `savedOnly` filter come off the title row, along with the
alternate lede and the two empty-state messages that served the filter. The Saved
tab replaces that filter.

## One extraction

The search preview and the Saved detail render the same ingredients and steps in
the same style. That body moves into a shared component in `src/ui/`, used by both.

The meal detail styles its ingredient list differently, inside a bordered card, and
is left alone. Forcing all three into one component would mean choosing one of the
two treatments, which is a visual decision this change has no reason to make.

## Testing

| Suite | Covers |
|---|---|
| `src/domain/saved.test.ts` (new) | Both save paths, both no-duplicate rules, unsave, unlink, and the two lookups |
| `src/domain/cycle.test.ts` | Deleting a meal keeps its saved entry and nulls the link; adding from saved creates the meal and links it in one step |
| `src/store/migrate.test.ts` (new) | A stored document with flagged meals becomes linked entries with no flags; a document without them gains an empty array |

The `toggleSaved` tests come out with the function. Contrast tests are unaffected:
the save control's colours and its two states do not change.

Every test runs against plain objects. Nothing here needs a simulator, which is the
same bar the rest of the domain suite meets.
