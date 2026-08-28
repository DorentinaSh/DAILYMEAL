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
  rollover,
  skip,
  updateMeal,
} from '@/domain/cycle';
import type { AppState, Category, Meal } from '@/domain/types';
import { persistStorage, STORAGE_KEY } from './storage';

export type MealDraft = Omit<Meal, 'id'>;

type Actions = {
  /** Applies any pending day change. Safe to call on every launch or focus. */
  refresh: () => void;
  skipMeal: (category: Category) => void;
  createMeal: (draft: MealDraft) => void;
  saveMeal: (meal: Meal) => void;
  removeMeal: (id: string) => void;
  setNotify: (category: Category, notify: boolean) => void;
  setTime: (category: Category, time: string) => void;
};

export type Store = AppState & Actions & { hydrated: boolean };

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      ...createEmptyState(),
      hydrated: false,

      refresh: () => set((s) => rollover(s, dateKey(new Date()))),

      skipMeal: (category) => set((s) => skip(s, category)),

      createMeal: (draft) => set((s) => addMeal(s, { ...draft, id: makeId() })),

      saveMeal: (meal) => set((s) => updateMeal(s, meal)),

      removeMeal: (id) => set((s) => deleteMeal(s, id)),

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
