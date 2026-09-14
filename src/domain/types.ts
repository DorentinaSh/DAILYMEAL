/**
 * Core data shapes. Everything the app knows lives in AppState, which is
 * persisted to the device as one JSON document.
 */

/** Extending this union is how dinner/snack get added later. */
export const CATEGORIES = ['breakfast', 'lunch'] as const;

export type Category = (typeof CATEGORIES)[number];

export type Meal = {
  id: string;
  name: string;
  category: Category;
  /** One entry per line, as typed in the editor. */
  ingredients: string[];
  /** One entry per line, as typed in the editor. */
  steps: string[];
  prepMinutes: number | null;
  /**
   * Kept for later, for whatever reason — not a favourite, and nothing to do
   * with the rotation. Optional because meals stored before this existed have
   * no such field, and absent reads as unsaved.
   */
  saved?: boolean;
};

/**
 * A recipe kept for later. It holds the whole recipe rather than a pointer,
 * which is what lets a bookmark outlive the meal made from it: deleting the
 * meal nulls `mealId` and leaves the text and photo untouched.
 */
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

/** The current loop for one category: a shuffled order and where we are in it. */
export type Cycle = {
  /** Meal ids. Every meal in the category appears exactly once. */
  order: string[];
  /** Index into `order` of the meal being served now. */
  position: number;
};

export type DayPick = {
  /** 'YYYY-MM-DD' in device local time. */
  date: string;
  /** Null when the category has no meals. */
  mealId: string | null;
  /** Ids skipped today, in the order they were skipped. */
  skippedToday: string[];
};

export type CategorySettings = {
  notify: boolean;
  /** 'HH:mm', 24-hour, device local. */
  time: string;
};

export type AppState = {
  meals: Meal[];
  /** Newest first. Insertion order is the list's order. */
  saved: SavedRecipe[];
  cycles: Record<Category, Cycle>;
  today: Record<Category, DayPick>;
  settings: Record<Category, CategorySettings>;
};

export const DEFAULT_TIMES: Record<Category, string> = {
  breakfast: '07:30',
  lunch: '11:30',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
};
