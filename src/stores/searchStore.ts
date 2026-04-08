import { create } from 'zustand';
import type { Work } from '@shared/domain';
import type { SearchResult, SemanticSearchResult } from '@shared/ipc';

export type SearchMode = 'exact' | 'semantic';

interface SearchState {
  /** Current user-facing query. */
  query: string;
  /** Committed query that produced `results` — may lag `query` by a keystroke. */
  committedQuery: string;
  /** Search mode: 'exact' (FTS5) or 'semantic' (embeddings). */
  mode: SearchMode;
  /** FTS5 results (exact mode). */
  results: SearchResult[];
  /** Semantic search results. */
  semanticResults: SemanticSearchResult[];
  /** Restrict to these canons; empty = all. */
  workFilter: Work[];
  loading: boolean;
  error: string | null;

  setQuery: (q: string) => void;
  setMode: (mode: SearchMode) => void;
  toggleWorkFilter: (work: Work) => void;
  clearFilters: () => void;
  clearSearch: () => void;
  runSearch: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  committedQuery: '',
  mode: 'exact',
  results: [],
  semanticResults: [],
  workFilter: [],
  loading: false,
  error: null,

  setQuery: (q) => set({ query: q }),

  setMode: (mode) => {
    set({ mode });
    // Re-run search if there's a committed query so the mode switch feels live.
    if (get().committedQuery) {
      void get().runSearch();
    }
  },

  toggleWorkFilter: (work) => {
    const current = get().workFilter;
    const next = current.includes(work)
      ? current.filter((w) => w !== work)
      : [...current, work];
    set({ workFilter: next });
    if (get().committedQuery) {
      void get().runSearch();
    }
  },

  clearFilters: () => {
    set({ workFilter: [] });
    if (get().committedQuery) void get().runSearch();
  },

  clearSearch: () =>
    set({ query: '', committedQuery: '', results: [], semanticResults: [], error: null }),

  runSearch: async () => {
    const { query, workFilter, mode } = get();
    const trimmed = query.trim();
    if (!trimmed) {
      set({ committedQuery: '', results: [], semanticResults: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      if (mode === 'semantic') {
        const semanticResults = await window.api.ai.semanticSearch(trimmed, {
          works: workFilter.length > 0 ? workFilter : undefined
        });
        set({ semanticResults, results: [], committedQuery: trimmed, loading: false });
      } else {
        const results = await window.api.db.searchVerses(trimmed, {
          works: workFilter.length > 0 ? workFilter : undefined
        });
        set({ results, semanticResults: [], committedQuery: trimmed, loading: false });
      }
    } catch (err) {
      console.error('[searchStore] runSearch failed', err);
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false
      });
    }
  }
}));
