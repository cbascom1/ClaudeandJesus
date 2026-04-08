import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/types/ipc';
import {
  getAllStudyLists,
  createStudyList,
  updateStudyList,
  deleteStudyList,
  getStudyListVerses,
  addVerseToStudyList,
  removeVerseFromStudyList,
  reorderStudyListVerse,
  getStudyListStats
} from '../db/queries/studyLists';

export function registerStudyListHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.studyListsGetAll, () => getAllStudyLists());

  ipcMain.handle(IPC_CHANNELS.studyListsCreate, (_evt, name: string, description: string | null) =>
    createStudyList(name, description)
  );

  ipcMain.handle(IPC_CHANNELS.studyListsUpdate, (_evt, id: number, name: string, description: string | null) =>
    updateStudyList(id, name, description)
  );

  ipcMain.handle(IPC_CHANNELS.studyListsDelete, (_evt, id: number) =>
    deleteStudyList(id)
  );

  ipcMain.handle(IPC_CHANNELS.studyListsGetVerses, (_evt, listId: number) =>
    getStudyListVerses(listId)
  );

  ipcMain.handle(IPC_CHANNELS.studyListsAddVerse, (_evt, listId: number, verseId: number) =>
    addVerseToStudyList(listId, verseId)
  );

  ipcMain.handle(IPC_CHANNELS.studyListsRemoveVerse, (_evt, listId: number, verseId: number) =>
    removeVerseFromStudyList(listId, verseId)
  );

  ipcMain.handle(IPC_CHANNELS.studyListsReorderVerse, (_evt, listId: number, verseId: number, newOrder: number) =>
    reorderStudyListVerse(listId, verseId, newOrder)
  );

  ipcMain.handle(IPC_CHANNELS.studyListsGetStats, () => getStudyListStats());
}
