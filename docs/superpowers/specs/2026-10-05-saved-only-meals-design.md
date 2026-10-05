# DAILYMEAL — Saved-Only Meals

**Date:** 2026-10-05
**Status:** Approved in conversation, awaiting review of this written spec

## Purpose

Saved is a flag on a meal, and every meal belongs to Breakfast or Lunch. So the
only way to keep a recipe is to put it into a rotation: bookmarking something you
want to look at later also means it can turn up as tomorrow's lunch.

Saving should be its own decision. A recipe you bookmark in Search goes into
Saved and nowhere else — never served, never counted, never reminded about —
until you decide to cook it regularly and move it into Breakfast or Lunch.

The saved-recipes design of 2026-09-14 answered the same need with a separate
`SavedRecipe` collection; it was built on a branch and never merged. This design
keeps one kind of thing, the meal, and lets its list be empty.

## Scope

**In scope**

- A meal whose list is none: saved only, outside every rotation
- A bookmark on each search result card that saves the recipe that way
- Moving a saved-only meal into Breakfast or Lunch, from its page and from `+`
- The Saved tab, the meal page and the editor understanding a meal with no list

**Out of scope**

- Moving a Breakfast or Lunch meal *out* to saved-only
- Folders, ordering or search within Saved
- Any change to how the rotation picks, skips or rolls over
- The filter button on Search, which stays unwired

## The four decisions

1. **No list, rather than a switch.** `Meal.category` becomes
   `Category | null`. The alternative — keep every meal in a list and add an
   `inRotation` flag — gives saved-only meals a Breakfast or Lunch label that
   means nothing, and makes every rotation function remember to skip them; one
   that forgets serves a recipe you only saved as today's lunch, and nothing
   warns about it beforehand. With null, the rotation only ever asks for meals
   *in* a category, so a saved-only meal is outside it by construction.
2. **A meal with no list is always saved.** There is no other way for one to
   exist. `addMeal` enforces it rather than trusting callers.
3. **Unbookmarking a saved-only meal deletes it.** It is not anywhere else to
   stay. On a search card that happens with no question, because you watch it
   go and can tap again to undo. On the meal's own page it asks first, because
   that is where you least expect a tap to delete something.
4. **Moving in goes through the normal add path.** A saved-only meal entering
   Breakfast or Lunch joins the loop exactly as a brand-new meal does, at a
   random spot after today's pick, and keeps its bookmark.

## Data model

```ts
export type Meal = {
  // …unchanged fields…
  /** Breakfast or Lunch — or null, saved only and outside every rotation. */
  category: Category | null;
};
```

No migration: every stored meal already has a category, and `null` is valid
JSON in the persisted document.

## Domain (`src/domain/cycle.ts`)

- `mealsIn(state, category)` — unchanged. It filters on equality, so a null
  meal is never in it. Everything that reads the rotation goes through it:
  Today, `canSkip`, `schedule.ts`, Settings counts, the Breakfast and Lunch
  lists and their badges.
- `addMeal(state, meal)` — when `meal.category` is null, appends the meal with
  `saved: true` and returns. No cycle is touched and `syncToday` is not called,
  so adding one never moves what is being served.
- `deleteMeal(state, id)` — when the meal's category is null, removes it from
  `meals` only.
- `placeMeal(state, id, category)` — new. Moves a saved-only meal into a list:
  removes it, then `addMeal`s it with that category. A meal that already has a
  list is returned unchanged; moving between lists is `updateMeal`'s job.
- `toggleSaved(state, id)` — when the meal is saved-only, returns
  `deleteMeal(state, id)`. Otherwise unchanged: it flips the flag and leaves the
  day alone.
- `updateMeal(state, meal)` — when both the stored and the new category are
  null, replaces the meal without calling `syncToday`. Any change of category
  still goes through delete-then-add, which now handles null on either side.

## Search (`src/search/keep.ts`)

- `keptAsMeal(hit, category, keepForLater)` — `category` widens to
  `Category | null`. With null, `saved` is true whatever `keepForLater` says.
- `keptMealFor(hit, meals): Meal | null` — new, replacing `isKept`. Finds the
  meal a recipe became by its photo URL, for the same reasons `isKept` did: a
  typed meal that shares a name is not it, renaming does not lose it, and a
  recipe with no photo is never claimed. The card derives both of its states
  from the one meal it returns.

## Store (`src/store/useAppStore.ts`)

- `placeMeal(id, category)` — new, wraps the domain function.
- `toggleSaved(id)` — when the meal is saved-only, deletes its photo file first,
  the way `removeMeal` does, then applies the domain function. The file work
  stays outside the updater so `cycle.ts` stays pure.

## Screens

### Search result card

- A bookmark at the top right: `SaveButton` at a new `size="sm"`, a 32pt pill
  with a 44pt touch target, in the existing `SAVE_COLORS`. It sits beside the
  card body and the add button as a sibling, so a screen reader reaches each
  one on its own.
- Bookmark, recipe not in your meals: `createMeal(keptAsMeal(hit, null, true))`.
- Bookmark, recipe already a meal: `toggleSaved` on it — which deletes it if it
  was saved-only, and only unbookmarks it if it is in a list.
- `+`, recipe not in your meals: asks Breakfast / Lunch / Cancel and creates it
  there, as now.
- `+`, recipe saved-only: asks the same, then `placeMeal`s the existing meal, so
  there is never a second copy.
- `+` shows ✓, and stops offering itself, only when the recipe's meal is in
  Breakfast or Lunch. A saved-only recipe still shows `+`.

### Recipe preview (`app/search/[id].tsx`)

Found while building, not in the approved design: the preview's own
`Add to breakfast / lunch` button always created a new meal, so a recipe
bookmarked from its card first would end up as two. When the recipe is already
a saved-only meal, the button `placeMeal`s it instead, keeping its bookmark.

### Saved tab (in Meals)

- Lists both kinds together, as now. The meta line leads with the list, and a
  saved-only meal reads `Saved only · 9 ingredients`.
- Empty text: "Nothing saved yet. Tap the bookmark on a meal or a recipe in
  Search to keep it here."

### Meal page (`app/meal/[id].tsx`)

For a saved-only meal:

- The bar's label reads `Saved` instead of a category, and there is no cycle, so
  the `N of M this round` chip does not render.
- `Add to breakfast` and `Add to lunch`, solid, sit above Edit and Delete; Edit
  becomes outline on this page so there are not three solid buttons in a row.
  Each calls `placeMeal`; the page then re-renders as that list's meal.
- The bookmark asks first: "Remove from Saved? It isn't in Breakfast or Lunch,
  so it will be deleted." Confirming deletes it and goes back.

### Editor (`app/meal/edit.tsx`)

- Editing a saved-only meal hides the `Served as` picker and keeps the category
  null, so saving an edit can never drop it into a rotation. Moving in happens
  through the page's two buttons.
- New meals from the Add button are unchanged: they always have a list.

## Testing

Test-first, in the existing suites.

`src/domain/cycle.test.ts`:

- A saved-only meal is in no `mealsIn`, is never today's pick, is never served
  by `rollover`, is never skipped to, and does not count towards `canSkip`.
- `addMeal` with null leaves cycles and today exactly as they were, and stores
  the meal as saved even when given `saved: false`.
- `deleteMeal` of a saved-only meal leaves cycles and today alone.
- `placeMeal` puts the meal into that category's loop after today's pick, keeps
  it saved, and leaves a meal that already has a list unchanged.
- `toggleSaved` on a saved-only meal deletes it; on a listed meal it still only
  flips the flag.
- `updateMeal` of a saved-only meal keeps it out of every cycle.
- The existing never-mutated-in-place check covers the new paths.

`src/search/keep.test.ts`:

- `keptAsMeal` with null is saved regardless of `keepForLater`.
- `keptMealFor` returns the meal by photo URL, survives a rename, ignores a
  typed meal of the same name, and never claims a recipe with no photo.

Screens are checked by typecheck, an `expo export` build, and by hand on a
device: bookmark a recipe, find it in Saved only, add it to lunch from its page,
and unbookmark a saved-only recipe from both places.

## What this does not fix

- A Breakfast or Lunch meal cannot be sent back to saved-only. Unbookmarking it
  keeps it in its list, as today.
- A recipe with no photo can be bookmarked and added, but its card cannot
  recognise it afterwards, so it will offer to save or add it again.
