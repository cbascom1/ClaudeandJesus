import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/types/ipc';
import {
  getCrossRefsForVerse,
  addCrossRef,
  updateCrossRefNote,
  removeCrossRef
} from '../db/queries/crossRefs';

export function registerCrossRefHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.crossRefsGetForVerse, (_evt, verseId: number) =>
    getCrossRefsForVerse(verseId)
  );

  ipcMain.handle(IPC_CHANNELS.crossRefsAdd, (_evt, sourceVerseId: number, targetVerseId: number, note: string | null) =>
    addCrossRef(sourceVerseId, targetVerseId, note)
  );

  ipcMain.handle(IPC_CHANNELS.crossRefsUpdateNote, (_evt, id: number, note: string | null) =>
    updateCrossRefNote(id, note)
  );

  ipcMain.handle(IPC_CHANNELS.crossRefsRemove, (_evt, id: number) =>
    removeCrossRef(id)
  );
}
