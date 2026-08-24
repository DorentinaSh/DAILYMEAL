# DAILYMEAL — Design

**Date:** 2026-08-24
**Status:** Approved, ready for implementation planning

## Purpose

A personal mobile app that answers one question every morning: what am I eating
today? You enter your meals once, with ingredients and preparation steps. Each
day the app suggests one breakfast and one lunch, drawn in rotation so every
meal you enter gets its turn. If you lack the ingredients for what it picked,
you skip that meal and it immediately offers another; the skipped meal returns
later in the loop.

Breakfast and lunch are independent — skipping one never affects the other.

## Scope

**In scope**

- Meal library: create, edit, delete meals with ingredients, steps, and prep time
- Independent rotation per category, guaranteeing every meal appears before repeats
- One suggestion per category per day, stable across app opens
- Per-meal skip with instant re-roll
- Local daily notifications naming the suggested meal
- All data stored on the device

**Out of scope**

- Accounts, sync, or any server
- Photos of meals
- Pantry or ingredient inventory tracking
- Shopping lists
- Meal history or analytics
- Dinner and snacks (the model allows them; the UI does not expose them yet)

## Platform and stack

- **Expo (React Native) + TypeScript** — one codebase for iOS and Android, run
  on a personal device through Expo Go without store submission
- **expo-router** — file-based routing, same mental model as Next.js `app/`
- **Zustand + persist middleware** — app state in memory, written to device
  storage on every change
- **AsyncStorage** — behind a small adapter interface, so moving to
  `expo-sqlite` later touches one file
- **expo-notifications** — local scheduled notifications, no push service
- **Jest (jest-expo preset)** — unit tests for domain logic

The dataset is small: tens of meals, a few kilobytes of JSON. A database would
add schema and migration work with no benefit at this size.

## Data model

```ts
type Category = 'breakfast' | 'lunch';   // extensible to 'dinner', 'snack'

type Meal = {
  id: string;
  name: string;
  category: Category;
  ingredients: string[];      // one entry per line as typed
  steps: string[];            // one entry per line as typed
  prepMinutes: number | null;
};

type Cycle = {
  order: string[];            // meal ids in shuffled order — the current loop
  position: number;           // index of the meal currently being served
};

type DayPick = {
  date: string;               // 'YYYY-MM-DD' in device local time
  mealId: string | null;      // null when the category has no meals
  skippedToday: string[];     // meal ids skipped today, in order
};

type CategorySettings = {
  notify: boolean;
  time: string;               // 'HH:mm', 24-hour, device local
};

type AppState = {
  meals: Meal[];
  cycles: Record<Category, Cycle>;
  today: Record<Category, DayPick>;
  settings: Record<Category, CategorySettings>;
};
```

Category is a string union rather than a boolean pair, and every structure keyed
by it is a `Record<Category, …>`. Adding `dinner` is a change to the union and
the settings UI, not a restructuring.

## Rotation engine

All rotation logic is pure functions in `src/domain/`: given a state and a date,
return a new state. No React, no storage, no SDK calls. This is the only part of
the app with non-obvious behavior, and keeping it pure makes it fully testable
without a simulator.

### Serving

Today's meal for a category is `cycle.order[cycle.position]`. The result is
stored in `today[category]`, so reopening the app shows the same meal rather
than recomputing a new one.

### Day rollover

On every app launch, compare `today[category].date` to the current local date.
If they differ:

1. Advance `position` by one.
2. If `position` runs past the end of `order`, reshuffle `order` into a new
   cycle and reset `position` to 0. When the category holds more than one meal,
   a shuffle whose first meal equals the last meal of the previous cycle is
   rejected and retried, so the same meal never lands on two consecutive days.
   The guard is skipped for a single-meal category, where no other outcome is
   possible.
3. Write a fresh `DayPick` with the new date and an empty `skippedToday`.

Rollover is evaluated per category, independently.

### Skip

Skipping today's meal for a category:

1. Remove the current meal id from `order` at `position`.
2. Append it to the end of `order`.
3. Leave `position` unchanged — the next meal has slid into that index and is
   served immediately. This is the instant re-roll.
4. Append the skipped id to `skippedToday`.

The skipped meal is not scheduled or flagged. It simply sits later in the loop
and comes around in the normal course of rotation.

### Edge cases

| Situation | Behavior |
|---|---|
| Category has no meals | `mealId` is null; the Today card invites you to add your first meal |
| Category has one meal | Served every day; skipping reports there is nothing else to offer |
| Every meal skipped today | `skippedToday.length >= meals in category` — stop re-rolling, show a message rather than cycling forever |
| Meal deleted | Removed from `order`; `position` adjusted to stay in range; if it was today's pick, re-roll immediately |
| Meal added | Inserted at a random index *after* the current position in the existing cycle, so a newly entered meal appears within days rather than after a full loop |
| Meal's category changed | Treated as a delete from the old cycle and an add to the new one |
| Clock moved backwards | Date comparison is by string equality, not ordering; a stale date triggers exactly one rollover regardless of direction |

## Screens

Bottom tab navigation with three tabs; detail screens push on top.

**Today** (`app/(tabs)/index.tsx`) — the home screen. One card per category,
each showing meal name, prep time, and the full ingredient list, because that is
what answers "can I make this?" without another tap. Each card carries its own
**Skip** button. Tapping the card opens the recipe. An empty category shows an
invitation to add a meal instead of a broken card.

**Meals** (`app/(tabs)/meals.tsx`) — the library, grouped by category. Add,
edit, delete.

**Settings** (`app/(tabs)/settings.tsx`) — per category: notification toggle and
time.

**Recipe detail** (`app/meal/[id].tsx`) — full ingredients and steps. Reached
from a Today card, the library, or a notification tap.

**Meal editor** (`app/meal/edit.tsx`) — name, category, ingredients, steps, prep
time. Ingredients and steps are multiline text inputs split on newlines, not
repeating field widgets: entering twenty recipes should be typing, not tapping
"add row" two hundred times.

## Notifications

Local notifications scheduled with `expo-notifications`. No server, no push
tokens.

A daily repeating notification carries fixed text, but the meal changes daily.
The app therefore schedules a **rolling seven-day window** of individual
notifications with real meal names — up to fourteen scheduled at a time. The
window is cancelled and regenerated whenever state changes: app launch, a skip,
a meal edit, a settings change.

The window builder is a pure function in `src/domain/schedule.ts`, taking state
and a start date and returning a list of `{ date, time, title, body, mealId }`.
`src/notifications/client.ts` is the only file that calls the SDK.

**Known limitation:** if the app is not opened for more than seven days, the
window empties and notifications stop until the next launch. The alternative —
background tasks that wake the app to compute a notification — is unreliable on
iOS, and the app is opened daily by design. Accepted.

**Permissions** are requested when notifications are first enabled in Settings,
not at launch, since a permission prompt before the user has seen the app
usually gets denied. If permission is denied, Settings shows how to enable it in
the OS settings rather than silently failing.

Tapping a notification deep-links to that meal's recipe.

## Project structure

```
DAILYMEAL/
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      index.tsx            # Today
      meals.tsx            # Library
      settings.tsx
    meal/
      [id].tsx             # Recipe detail
      edit.tsx             # New and edit
  src/
    domain/                # pure — no React, no storage, no SDK
      types.ts
      cycle.ts
      cycle.test.ts
      schedule.ts
      schedule.test.ts
    store/
      useAppStore.ts       # zustand + persist
      storage.ts           # AsyncStorage adapter — the swappable seam
    notifications/
      client.ts            # the only file touching expo-notifications
    ui/                    # MealCard, IngredientList, ...
  docs/superpowers/specs/
```

## Testing

Domain logic is tested first, before implementation:

- Advancing one day serves the next meal in the cycle
- Reaching the end of a cycle reshuffles and resets position
- A reshuffle never places last cycle's final meal first
- Skip moves the meal to the back and serves the next one without advancing
- Skipping every meal in a category stops re-rolling
- A single-meal category serves that meal daily
- Deleting the current meal re-rolls immediately and keeps position in range
- Adding a meal places it after the current position in the current cycle
- Changing a meal's category moves it between cycles
- Rollover across a real date boundary produces exactly one advance
- The notification window builder produces correct dates, times, and meal names
- The window regenerates correctly after a skip

Screens are verified by hand on a device. Component tests for a five-screen
personal app cost more than they return.

## Order of work

1. Scaffold Expo, expo-router, and tabs; confirm it runs on a real phone
2. Domain engine, test-first
3. Store and persistence
4. Meals library and editor — enough to enter real data
5. Today screen and skip
6. Recipe detail
7. Settings and notifications

Notifications come last deliberately: they are the most likely to fight us, and
the app is useful without them.
