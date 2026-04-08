import { create } from 'zustand';
import type {
  SidecarStatus,
  EmbeddingProgress,
  EmbeddingStats,
  SemanticSearchResult,
  AiTopicSuggestion
} from '@shared/ipc';

interface AiState {
  // Sidecar status
  sidecarStatus: SidecarStatus | null;
  sidecarLoading: boolean;
  sidecarError: string | null;

  // Embedding generation
  embeddingStats: EmbeddingStats | null;
  embeddingProgress: EmbeddingProgress | null;
  isGenerating: boolean;

  // Semantic search results
  semanticResults: SemanticSearchResult[];
  semanticLoading: boolean;

  // AI topic suggestions for batch review
  suggestions: AiTopicSuggestion[];
  suggestionsFor: { verseId: number; text: string } | null;
  suggestionsLoading: boolean;

  // Actions
  startSidecar: () => Promise<void>;
  stopSidecar: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  generateEmbeddings: () => Promise<void>;
  loadEmbeddingStats: () => Promise<void>;
  semanticSearch: (query: string, works?: string[]) => Promise<void>;
  clearSemanticResults: () => void;
  classifyVerse: (verseId: number, text: string) => Promise<void>;
  clearSuggestions: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  sidecarStatus: null,
  sidecarLoading: false,
  sidecarError: null,
  embeddingStats: null,
  embeddingProgress: null,
  isGenerating: false,
  semanticResults: [],
  semanticLoading: false,
  suggestions: [],
  suggestionsFor: null,
  suggestionsLoading: false,

  startSidecar: async () => {
    set({ sidecarLoading: true, sidecarError: null });
    try {
      const status = await window.api.ai.sidecarStart();
      set({ sidecarStatus: status, sidecarLoading: false });
    } catch (err) {
      set({
        sidecarError: err instanceof Error ? err.message : String(err),
        sidecarLoading: false
      });
    }
  },

  stopSidecar: async () => {
    await window.api.ai.sidecarStop();
    set({ sidecarStatus: { running: false, port: null, model: null, pid: null } });
  },

  refreshStatus: async () => {
    try {
      const status = await window.api.ai.sidecarStatus();
      set({ sidecarStatus: status });
    } catch {
      set({ sidecarStatus: { running: false, port: null, model: null, pid: null } });
    }
  },

  generateEmbeddings: async () => {
    set({ isGenerating: true, embeddingProgress: null });

    // Subscribe to progress events.
    const unsub = window.api.ai.onEmbeddingProgress((event) => {
      set({ embeddingProgress: event });
    });

    try {
      const stats = await window.api.ai.generateEmbeddings();
      set({ embeddingStats: stats, isGenerating: false });
    } catch (err) {
      console.error('[aiStore] generateEmbeddings failed', err);
      set({ isGenerating: false });
    } finally {
      unsub();
    }
  },

  loadEmbeddingStats: async () => {
    try {
      const stats = await window.api.ai.embeddingStats();
      set({ embeddingStats: stats });
    } catch (err) {
      console.error('[aiStore] loadEmbeddingStats failed', err);
    }
  },

  semanticSearch: async (query, works) => {
    set({ semanticLoading: true });
    try {
      const results = await window.api.ai.semanticSearch(query, {
        works: works as import('@shared/domain').Work[] | undefined
      });
      set({ semanticResults: results, semanticLoading: false });
    } catch (err) {
      console.error('[aiStore] semanticSearch failed', err);
      set({ semanticLoading: false });
    }
  },

  clearSemanticResults: () => set({ semanticResults: [] }),

  classifyVerse: async (verseId, text) => {
    set({ suggestionsLoading: true, suggestionsFor: { verseId, text } });
    try {
      const suggestions = await window.api.ai.classifyVerse(text);
      set({ suggestions, suggestionsLoading: false });
    } catch (err) {
      console.error('[aiStore] classifyVerse failed', err);
      set({ suggestionsLoading: false });
    }
  },

  clearSuggestions: () => set({ suggestions: [], suggestionsFor: null })
}));
