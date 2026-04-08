import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/types/ipc';
import {
  getNotesForVerse,
  createNote,
  updateNote,
  deleteNote
} from '../db/queries/notes';

export function registerNoteHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.notesGetForVerse, (_evt, verseId: number) =>
    getNotesForVerse(verseId)
  );

  ipcMain.handle(IPC_CHANNELS.notesCreate, (_evt, verseId: number, content: string) =>
    createNote(verseId, content)
  );

  ipcMain.handle(IPC_CHANNELS.notesUpdate, (_evt, noteId: number, content: string) =>
    updateNote(noteId, content)
  );

  ipcMain.handle(IPC_CHANNELS.notesDelete, (_evt, noteId: number) =>
    deleteNote(noteId)
  );
}
