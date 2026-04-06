import { create } from 'zustand';
import type { Book, Chapter, Verse } from '@shared/domain';

export interface ReadingTab {
  id: string;
  type: 'reading';
  bookId: number;
  chapterId: number;
  title: string;
}

interface LibraryState {
  // Library tree
  books: Book[];
  chaptersByBook: Record<number, Chapter[]>;
  versesByChapter: Record<number, Verse[]>;

  // Tabs
  tabs: ReadingTab[];
  activeTabId: string | null;

  // Per-view selection
  selectedVerseId: number | null;

  // Loading flags
  loadingBooks: boolean;
  loadingVersesFor: number | null;

  // Actions — data loading
  loadBooks: () => Promise<void>;
  loadChaptersForBook: (bookId: number) => Promise<Chapter[]>;
  loadVersesForChapter: (chapterId: number) => Promise<Verse[]>;

  // Actions — tabs
  openChapterInTab: (bookId: number, chapterId: number) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => Promise<void>;

  // Actions — verse selection
  selectVerse: (verseId: number | null) => void;
}

function tabIdFor(chapterId: number): string {
  return `chapter-${chapterId}`;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  chaptersByBook: {},
  versesByChapter: {},
  tabs: [],
  activeTabId: null,
  selectedVerseId: null,
  loadingBooks: false,
  loadingVersesFor: null,

  loadBooks: async () => {
    set({ loadingBooks: true });
    try {
      const books = await window.api.db.getBooks();
      set({ books, loadingBooks: false });
    } catch (err) {
      console.error('[libraryStore] loadBooks failed', err);
      set({ loadingBooks: false });
    }
  },

  loadChaptersForBook: async (bookId) => {
    const existing = get().chaptersByBook[bookId];
    if (existing) return existing;
    const chapters = await window.api.db.getChaptersByBook(bookId);
    set((state) => ({
      chaptersByBook: { ...state.chaptersByBook, [bookId]: chapters }
    }));
    return chapters;
  },

  loadVersesForChapter: async (chapterId) => {
    const existing = get().versesByChapter[chapterId];
    if (existing) return existing;
    set({ loadingVersesFor: chapterId });
    try {
      const verses = await window.api.db.getVersesByChapter(chapterId);
      set((state) => ({
        versesByChapter: { ...state.versesByChapter, [chapterId]: verses },
        loadingVersesFor: null
      }));
      return verses;
    } catch (err) {
      console.error('[libraryStore] loadVersesForChapter failed', err);
      set({ loadingVersesFor: null });
      return [];
    }
  },

  openChapterInTab: async (bookId, chapterId) => {
    const { tabs, books, loadVersesForChapter, loadChaptersForBook } = get();
    const id = tabIdFor(chapterId);

    // Focus existing tab if present (keep tab's existing title so we don't re-focus
    // and then overwrite it — though this is safe either way).
    if (tabs.some((t) => t.id === id)) {
      set({ activeTabId: id, selectedVerseId: null });
      await loadVersesForChapter(chapterId);
      return;
    }

    // Ensure chapters for this book are loaded so we can compute the tab title.
    // This matters when the user opens a tab via search result — they may not
    // have expanded this book in the sidebar yet.
    const chapters = await loadChaptersForBook(bookId);
    const book = books.find((b) => b.id === bookId);
    const chapter = chapters.find((c) => c.id === chapterId);
    const title = `${book?.title ?? 'Book'} ${chapter?.number ?? '?'}`;

    const tab: ReadingTab = { id, type: 'reading', bookId, chapterId, title };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: id,
      selectedVerseId: null
    }));
    await loadVersesForChapter(chapterId);
  },

  closeTab: (tabId) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return state;
      const nextTabs = state.tabs.filter((t) => t.id !== tabId);
      let nextActive = state.activeTabId;
      if (state.activeTabId === tabId) {
        // Pick the tab to the left, or the first remaining
        nextActive =
          nextTabs.length === 0
            ? null
            : (nextTabs[Math.max(0, idx - 1)]?.id ?? nextTabs[0]?.id ?? null);
      }
      return { tabs: nextTabs, activeTabId: nextActive, selectedVerseId: null };
    });
  },

  setActiveTab: async (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;
    set({ activeTabId: tabId, selectedVerseId: null });
    await get().loadVersesForChapter(tab.chapterId);
  },

  selectVerse: (verseId) => set({ selectedVerseId: verseId })
}));

/** Derived selector: currently active tab (or null). */
export function useActiveTab(): ReadingTab | null {
  return useLibraryStore((s) =>
    s.activeTabId ? (s.tabs.find((t) => t.id === s.activeTabId) ?? null) : null
  );
}
