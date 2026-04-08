import { create } from 'zustand';
import type { StudyList } from '@shared/domain';
import type { StudyListVerseRow, StudyListStat } from '@shared/ipc';

interface StudyListState {
  lists: StudyList[];
  listsLoaded: boolean;
  stats: StudyListStat[];
  selectedListId: number | null;
  selectedListVerses: StudyListVerseRow[];
  loading: boolean;

  loadLists: () => Promise<void>;
  loadStats: () => Promise<void>;
  createList: (name: string, description: string | null) => Promise<StudyList>;
  updateList: (id: number, name: string, description: string | null) => Promise<void>;
  deleteList: (id: number) => Promise<void>;
  selectList: (id: number | null) => Promise<void>;
  addVerseToList: (listId: number, verseId: number) => Promise<void>;
  removeVerseFromList: (listId: number, verseId: number) => Promise<void>;
  reorderVerse: (listId: number, verseId: number, newOrder: number) => Promise<void>;
}

export const useStudyListStore = create<StudyListState>((set, get) => ({
  lists: [],
  listsLoaded: false,
  stats: [],
  selectedListId: null,
  selectedListVerses: [],
  loading: false,

  loadLists: async () => {
    if (get().listsLoaded) return;
    try {
      const lists = await window.api.studyLists.getAll();
      set({ lists, listsLoaded: true });
    } catch (err) {
      console.error('[studyListStore] loadLists failed', err);
    }
  },

  loadStats: async () => {
    set({ loading: true });
    try {
      const stats = await window.api.studyLists.getStats();
      set({ stats, loading: false });
    } catch (err) {
      console.error('[studyListStore] loadStats failed', err);
      set({ loading: false });
    }
  },

  createList: async (name, description) => {
    const list = await window.api.studyLists.create(name, description);
    set((s) => ({ lists: [list, ...s.lists], listsLoaded: true }));
    return list;
  },

  updateList: async (id, name, description) => {
    await window.api.studyLists.update(id, name, description);
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, name, description } : l))
    }));
  },

  deleteList: async (id) => {
    await window.api.studyLists.remove(id);
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== id),
      stats: s.stats.filter((l) => l.id !== id),
      selectedListId: s.selectedListId === id ? null : s.selectedListId,
      selectedListVerses: s.selectedListId === id ? [] : s.selectedListVerses
    }));
  },

  selectList: async (id) => {
    if (id == null) {
      set({ selectedListId: null, selectedListVerses: [] });
      return;
    }
    set({ selectedListId: id, loading: true });
    try {
      const selectedListVerses = await window.api.studyLists.getVerses(id);
      set({ selectedListVerses, loading: false });
    } catch (err) {
      console.error('[studyListStore] selectList failed', err);
      set({ loading: false });
    }
  },

  addVerseToList: async (listId, verseId) => {
    await window.api.studyLists.addVerse(listId, verseId);
    if (get().selectedListId === listId) {
      await get().selectList(listId);
    }
  },

  removeVerseFromList: async (listId, verseId) => {
    await window.api.studyLists.removeVerse(listId, verseId);
    if (get().selectedListId === listId) {
      set((s) => ({
        selectedListVerses: s.selectedListVerses.filter((v) => v.verse_id !== verseId)
      }));
    }
  },

  reorderVerse: async (listId, verseId, newOrder) => {
    await window.api.studyLists.reorderVerse(listId, verseId, newOrder);
    if (get().selectedListId === listId) {
      await get().selectList(listId);
    }
  }
}));
