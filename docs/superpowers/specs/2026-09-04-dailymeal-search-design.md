# DAILYMEAL — Recipe Search

**Date:** 2026-09-04
**Status:** Approved, ready for implementation planning

## Purpose

Filling the meal library by typing is the app's slowest moment: every dish costs
a name, a list of ingredients, and a set of steps entered by hand. Search removes
that cost. You type a word, you get real dishes with photos, you tap one, you
choose breakfast or lunch, and it lands in your library as an ordinary meal —
already in the rotation, indistinguishable from one you typed yourself.

This is the first feature that reaches the network. The original design ruled out
"accounts, sync, or any server", and that still holds: the app talks directly to a
public read-only recipe API, owns no account, and sends nothing about the user.

## Scope

**In scope**

- A fourth tab, `Search`, sitting second in the bottom bar
- A search field that queries as you type
- A result list of cards: photo, dish name, and the source's own category
- A preview screen per result: photo, ingredients, steps
- Choosing breakfast or lunch, then saving into the existing meal library
- Honest empty, offline, and no-result states

**Out of scope**

- The filter button beside the search bar — wanted later, not now
- Storing photos on saved meals; the library stays text
- Favourites, search history, recently viewed
- Pagination — the source returns its whole result set in one response
- Any change to rotation, notifications, or the `Meal` shape

## Why an API and not scraping

The feature was first described as scraping recipes off the internet. It is worth
recording why the design does not do that.

Scraping means fetching a recipe site's HTML and parsing it. From a phone app that
fails on four fronts: most recipe sites render their content with JavaScript, so
the HTML that arrives is an empty shell; sites block clients that are not browsers;
the markup changes without warning and takes the parser down with it silently; and
copying their photographs and text into another app is a terms-of-service problem
rather than a technical one. Doing it properly requires a scraping server that
renders pages, caches results, and gets maintained — the exact server this app was
built to avoid.

A recipe API returns the same information as structured JSON over a single `fetch`,
with an image URL the publisher intends to be used. It is less work, it does not
break, and it stays inside the app's no-server constraint.

## Data source

**TheMealDB**, free tier, developer key `1`. No account, no signup, no secret to
keep out of the bundle.

```
GET https://www.themealdb.com/api/json/v1/1/search.php?s=<query>
```

Verified against the live endpoint while designing:

- One response carries the *complete* recipe — name, photo, category, area, up to
  twenty ingredient/measure pairs, and full instructions. Opening a result costs
  no second request.
- `search.php?s=chicken` returns 25 dishes with real instructions.
- No results is `{"meals": null}` — a null, not an empty array. Normalization must
  absorb this or the screen crashes on the first miss.
- Its categories are `Beef, Breakfast, Chicken, Dessert, Goat, Lamb, Miscellaneous,
  Pasta, Pork, Seafood, Side, Starter, Vegan, Vegetarian`. **There is no Lunch.**
  The source can say a dish is breakfast; it can never say a dish is lunch.
- The catalogue is a few hundred dishes. Narrow searches legitimately return
  nothing, and the empty state says so rather than implying the user mistyped.

That missing Lunch category settles the result card: cards show the source's own
category (`SEAFOOD`, `DESSERT`, `BREAKFAST`) rather than a fabricated
breakfast/lunch guess. The breakfast/lunch decision belongs to the person saving
the meal, and is asked on the preview screen where it can be answered honestly.

`searchRecipes()` is the seam. Everything above it works in `RecipeHit`, so
replacing TheMealDB with Spoonacular — the fallback if the catalogue proves too
thin in daily use — rewrites one file and no screen.

## Data model

Nothing persisted changes. `Meal`, `Cycle`, `DayPick`, and `AppState` are
untouched, and a saved recipe is an ordinary `Meal` with `prepMinutes: null`.

Search introduces one transient shape, never written to storage:

```ts
type RecipeHit = {
  id: string;              // idMeal
  name: string;            // strMeal
  imageUrl: string | null; // strMealThumb
  sourceCategory: string;  // strCategory — shown on the card
  area: string | null;     // strArea, e.g. 'Japanese'
  ingredients: string[];   // '2 Bread' — measure and name already merged
  steps: string[];         // strInstructions split into lines
};
```

Normalization rules, all pure:

- **Ingredients** — the API spreads twenty `strIngredient{n}`/`strMeasure{n}` pairs
  across the object, most of them empty or whitespace. Merge each populated pair
  into one trimmed `"<measure> <ingredient>"` line and drop the rest.
- **Steps** — `strInstructions` is one blob. Split on newlines, trim, drop blanks.
- **Default category** — `sourceCategory === 'Breakfast'` preselects breakfast on
  the preview screen; everything else preselects lunch. A preselection, not a
  claim: the control is right there to change.
- **Missing fields** — a null photo or absent instructions degrade to a placeholder
  tile and an empty section. A dish is never dropped for being incomplete.

## Screens

**Search** (`app/(tabs)/search.tsx`) — title and lede in the house pattern, then a
tile-white rounded field with a clear ×, then a `FlatList` of cards. A card is the
Meals row with a photo: 64×64 rounded image, dish name in Archivo, and
`SEAFOOD · Japanese` as a mono eyebrow beneath. A dish already in the library shows
`Added` where the chevron would be, matched on name, trimmed and
case-insensitive.

Querying is debounced 350ms and needs two characters. There is no search button.

Four states:

| State | What it says |
|---|---|
| Idle | Search for a dish to add it to your meals. |
| Loading | Spinner in ink |
| No results | Nothing found — the catalogue is small, suggest a plainer word |
| Error | Couldn't reach the recipe service, with Retry |

**Preview and save** (`app/search/[id].tsx`) — reads its hit from the search store
by id, so opening it makes no request. Photo, name, source category and area,
a Breakfast/Lunch segmented control, ingredients, numbered steps. The primary
button reads `Add to breakfast` or `Add to lunch`, calls the existing `createMeal`,
and pops back to the results, where that row now reads `Added`. Adding three dishes
in a row never costs a re-search.

If the store has no hit for that id — an app reload while the route is open — the
screen says the recipe is no longer loaded and offers the way back. It does not
silently refetch.

## Data flow

```
type → debounce 350ms → useSearchStore.search(q)
     → mealdb.searchRecipes(q)  [fetch, 10s abort]
     → normalize each raw meal → RecipeHit[]
     → store (stale sequence numbers discarded)
     → FlatList
     → tap → /search/[id] → hit read from store
     → choose category → createMeal → router.back()
```

The store holds `query`, `status`, `hits`, and `error`. It is a plain zustand
store with no `persist` middleware: results are session-scoped and must not reach
AsyncStorage. The screen owns the debounce; the store owns the request and guards
its own ordering.

## Error handling

- **Offline or non-200** — the error state with a working Retry, never a blank list
- **`{"meals": null}`** — normalized to `[]`; the verified shape of no results
- **Out-of-order responses** — each request carries a sequence number and a late
  reply for an abandoned query is discarded, so fast typing cannot resurrect stale
  results
- **Slow network** — `AbortController` with a 10 second timeout
- **Malformed rows** — per-field defaults; the dish still renders
- **Broken image URL** — `expo-image` placeholder, same tile as a missing photo
- **Query under two characters** — no request at all

## Project structure

```
app/
  _layout.tsx              # + register search/[id]
  (tabs)/
    _layout.tsx            # + Search tab, second; + drawn 'search' glyph
    search.tsx             # NEW — field and results
  search/
    [id].tsx               # NEW — preview and save
src/
  search/                  # NEW — the only place the network exists
    types.ts               # RecipeHit
    mealdb.ts              # the endpoint; the swappable file
    normalize.ts           # pure transforms
    normalize.test.ts
  store/
    useSearchStore.ts      # NEW — transient, not persisted
```

The tab glyph is drawn from Views like the other three — a ring and a short
diagonal — rather than imported from an icon set, keeping the chrome's one rule.

`expo-image` is added for the thumbnails: disk caching so repeat searches are
instant, a real placeholder, and a fade rather than a pop. It ships with the Expo
SDK and works in Expo Go.

## Testing

Pure normalization is tested first, against a fixture captured from the live
response, so the suite never touches the network:

- Twenty ingredient slots collapse to only the populated lines, measures merged
- Whitespace-only ingredient and measure slots are dropped, not rendered blank
- An instruction blob splits into steps with blanks and padding removed
- `Breakfast` preselects breakfast; every other category preselects lunch
- `{"meals": null}` normalizes to an empty list
- A dish with no photo or no instructions still produces a valid `RecipeHit`

Screens are verified by hand on a device, consistent with the rest of the app.

## Order of work

1. `RecipeHit`, normalization, and its tests — no UI, no network
2. `mealdb.ts` against the live endpoint, verified by hand
3. `useSearchStore` with sequence guarding
4. The Search tab: glyph, field, cards, and all four states
5. Preview and save, including the `Added` marker on return

Normalization comes first because it is where the source's quirks live — the null,
the twenty slots, the missing Lunch — and it is the only part worth testing.
