import { create } from 'zustand';
import type { Note } from '@shared/domain';

interface NoteState {
  notes: Note[];
  notesFor: number | null;
  loading: boolean;

  loadNotes: (verseId: number) => Promise<void>;
  createNote: (verseId: number, content: string) => Promise<Note>;
  updateNote: (noteId: number, content: string) => Promise<void>;
  deleteNote: (noteId: number) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  notesFor: null,
  loading: false,

  loadNotes: async (verseId) => {
    set({ loading: true });
    try {
      const notes = await window.api.notes.getForVerse(verseId);
      set({ notes, notesFor: verseId, loading: false });
    } catch (err) {
      console.error('[noteStore] loadNotes failed', err);
      set({ loading: false });
    }
  },

  createNote: async (verseId, content) => {
    const note = await window.api.notes.create(verseId, content);
    set((s) => ({ notes: [note, ...s.notes] }));
    return note;
  },

  updateNote: async (noteId, content) => {
    await window.api.notes.update(noteId, content);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, content, updated: new Date().toISOString() } : n
      )
    }));
  },

  deleteNote: async (noteId) => {
    await window.api.notes.remove(noteId);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== noteId) }));
  }
}));
