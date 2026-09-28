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
   * The source's photo, for a meal that arrived from search. Optional and
   * nullable for different reasons: absent means the meal was stored before
   * meals had photos at all, null means this one has no photo to show.
   */
  imageUrl?: string | null;
  /**
   * Kept for later, for whatever reason — not a favourite, and nothing to do
   * with the rotation. Optional because meals stored before this existed have
   * no such field, and absent reads as unsaved.
   */
  saved?: boolean;
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
