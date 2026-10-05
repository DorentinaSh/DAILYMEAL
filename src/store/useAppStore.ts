/**
 * The app's single store. It holds AppState and delegates every rule to the
 * pure functions in `domain/` — nothing here decides what happens, only when.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  addMeal,
  createEmptyState,
  dateKey,
  deleteMeal,
  makeId,
  mealById,
  placeMeal,
  rollover,
  skip,
  toggleSaved,
  updateMeal,
} from '@/domain/cycle';
import type { AppState, Category, Meal } from '@/domain/types';
import { deletePhoto } from '@/photos/files';
import { persistStorage, STORAGE_KEY } from './storage';

export type MealDraft = Omit<Meal, 'id'>;

type Actions = {
  /** Applies any pending day change. Safe to call on every launch or focus. */
  refresh: () => void;
  skipMeal: (category: Category) => void;
  createMeal: (draft: MealDraft) => void;
  saveMeal: (meal: Meal) => void;
  removeMeal: (id: string) => void;
  toggleSaved: (id: string) => void;
  /** Moves a saved-only meal into Breakfast or Lunch. */
  placeMeal: (id: string, category: Category) => void;
  setNotify: (category: Category, notify: boolean) => void;
  setTime: (category: Category, time: string) => void;
};

export type Store = AppState & Actions & { hydrated: boolean };

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createEmptyState(),
      hydrated: false,

      refresh: () => set((s) => rollover(s, dateKey(new Date()))),

      skipMeal: (category) => set((s) => skip(s, category)),

      createMeal: (draft) => set((s) => addMeal(s, { ...draft, id: makeId() })),

      saveMeal: (meal) => set((s) => updateMeal(s, meal)),

      // The file goes before the meal does, and outside the updater: deleteMeal
      // is a pure function of state and file I/O has no business inside it.
      removeMeal: (id) => {
        deletePhoto(mealById(get(), id)?.photoFile);
        set((s) => deleteMeal(s, id));
      },

      // Unbookmarking a saved-only meal deletes it, so its photo file goes too —
      // first, and outside the updater, exactly as in removeMeal.
      toggleSaved: (id) => {
        const meal = mealById(get(), id);
        if (meal && meal.category === null) deletePhoto(meal.photoFile);
        set((s) => toggleSaved(s, id));
      },

      placeMeal: (id, category) => set((s) => placeMeal(s, id, category)),

      setNotify: (category, notify) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [category]: { ...s.settings[category], notify },
          },
        })),

      setTime: (category, time) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [category]: { ...s.settings[category], time },
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: persistStorage,
      // Only the data is persisted; actions and the hydration flag are not.
      partialize: (s): AppState => ({
        meals: s.meals,
        cycles: s.cycles,
        today: s.today,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state) => {
        // Catch up to the current day the moment stored data lands.
        state?.refresh();
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);
