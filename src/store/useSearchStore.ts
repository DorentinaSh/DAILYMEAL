/**
 * Search state for the current session only. No persist middleware on purpose:
 * results are disposable, and writing them to storage would bloat the one JSON
 * document the app actually cares about. A recipe you keep becomes a Meal in
 * the real store instead.
 */
import { create } from 'zustand';

import { browseRecipes, MIN_QUERY, searchRecipes } from '@/search/mealdb';
import type { RecipeHit } from '@/search/types';

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

type SearchStore = {
  query: string;
  status: SearchStatus;
  hits: RecipeHit[];
  setQuery: (query: string) => void;
  run: (query: string) => Promise<void>;
};

export const useSearchStore = create<SearchStore>((set) => {
  // Typing fast means replies can land out of order. Only the newest may write.
  let latest = 0;

  return {
    query: '',
    status: 'idle',
    hits: [],

    setQuery: (query) => set({ query }),

    run: async (query) => {
      const seq = ++latest;
      // Nothing typed yet is not nothing to show: the tab opens on a browse.
      const searching = query.trim().length >= MIN_QUERY;

      set({ status: 'loading' });
      try {
        const hits = searching ? await searchRecipes(query) : await browseRecipes();
        if (seq !== latest) return;
        set({ hits, status: 'done' });
      } catch {
        if (seq !== latest) return;
        set({ hits: [], status: 'error' });
      }
    },
  };
});
