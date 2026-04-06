import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/types/ipc';
import type { SearchFilters } from '../../src/types/ipc';
import { getAllBooks } from '../db/queries/books';
import { getChaptersByBookId } from '../db/queries/chapters';
import { getVersesByChapterId, getVerseById } from '../db/queries/verses';
import { searchVerses } from '../db/queries/search';

export function registerDbHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.dbGetBooks, () => getAllBooks());

  ipcMain.handle(IPC_CHANNELS.dbGetChaptersByBook, (_evt, bookId: number) =>
    getChaptersByBookId(bookId)
  );

  ipcMain.handle(IPC_CHANNELS.dbGetVersesByChapter, (_evt, chapterId: number) =>
    getVersesByChapterId(chapterId)
  );

  ipcMain.handle(IPC_CHANNELS.dbGetVerseById, (_evt, verseId: number) =>
    getVerseById(verseId)
  );

  ipcMain.handle(
    IPC_CHANNELS.dbSearchVerses,
    (_evt, query: string, filters: SearchFilters) => searchVerses(query, filters)
  );
}
