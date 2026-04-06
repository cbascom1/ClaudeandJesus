import { create } from 'zustand';
import type { Work } from '@shared/domain';
import type { SearchResult } from '@shared/ipc';

interface SearchState {
  /** Current user-facing query. */
  query: string;
  /** Committed query that produced `results` — may lag `query` by a keystroke. */
  committedQuery: string;
  results: SearchResult[];
  /** Restrict to these canons; empty = all. */
  workFilter: Work[];
  loading: boolean;
  error: string | null;

  setQuery: (q: string) => void;
  toggleWorkFilter: (work: Work) => void;
  clearFilters: () => void;
  clearSearch: () => void;
  runSearch: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  committedQuery: '',
  results: [],
  workFilter: [],
  loading: false,
  error: null,

  setQuery: (q) => set({ query: q }),

  toggleWorkFilter: (work) => {
    const current = get().workFilter;
    const next = current.includes(work)
      ? current.filter((w) => w !== work)
      : [...current, work];
    set({ workFilter: next });
    // Re-run search if there's a committed query, so filter toggles feel live.
    if (get().committedQuery) {
      void get().runSearch();
    }
  },

  clearFilters: () => {
    set({ workFilter: [] });
    if (get().committedQuery) void get().runSearch();
  },

  clearSearch: () =>
    set({ query: '', committedQuery: '', results: [], error: null }),

  runSearch: async () => {
    const { query, workFilter } = get();
    const trimmed = query.trim();
    if (!trimmed) {
      set({ committedQuery: '', results: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const results = await window.api.db.searchVerses(trimmed, {
        works: workFilter.length > 0 ? workFilter : undefined
      });
      set({ results, committedQuery: trimmed, loading: false });
    } catch (err) {
      console.error('[searchStore] runSearch failed', err);
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false
      });
    }
  }
}));
