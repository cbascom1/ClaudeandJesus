import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFileSync } from 'node:fs';
import { IPC_CHANNELS } from '../../src/types/ipc';
import type {
  ImportConfirmRequest,
  ImportConfirmResponse,
  ImportConflict,
  ImportParseResult,
  ImportProgressEvent
} from '../../src/types/ipc';
import { parseScriptureText } from '../parser/scriptureParser';
import { getBookByTitleAndWork, insertBook, deleteBook } from '../db/queries/books';
import { insertChapter } from '../db/queries/chapters';
import { bulkInsertVerses } from '../db/queries/verses';
import type { BulkVerseRow } from '../db/queries/verses';
import type { Work } from '../../src/types/domain';

function conflictKey(work: string, title: string): string {
  return `${work}:${title}`;
}

function emitProgress(win: BrowserWindow | null, event: ImportProgressEvent): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.importProgress, event);
  }
}

export function registerImportHandlers(): void {
  // Step 1: file picker
  ipcMain.handle(IPC_CHANNELS.importPickFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Scripture Text',
      properties: ['openFile'],
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  // Step 2: parse file (returns preview)
  ipcMain.handle(IPC_CHANNELS.importParseFile, async (evt, filePath: string) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    emitProgress(win, { phase: 'reading', current: 0, total: 0, message: 'Reading file…' });
    const text = readFileSync(filePath, 'utf-8');

    emitProgress(win, { phase: 'parsing', current: 0, total: 0, message: 'Parsing…' });
    const result = parseScriptureText(text, filePath);

    emitProgress(win, {
      phase: 'parsing',
      current: result.stats.verseCount,
      total: result.stats.verseCount,
      message: `Parsed ${result.stats.verseCount} verses`
    });
    return result as ImportParseResult;
  });

  // Step 3: detect conflicts (which books already exist?)
  ipcMain.handle(
    IPC_CHANNELS.importDetectConflicts,
    async (_evt, parseResult: ImportParseResult) => {
      const conflicts: ImportConflict[] = [];
      for (const book of parseResult.books) {
        const existing = getBookByTitleAndWork(book.title, book.work as Work);
        if (existing) {
          conflicts.push({
            book: { title: book.title, work: book.work },
            existingId: existing.id
          });
        }
      }
      return conflicts;
    }
  );

  // Step 4: confirm import — actually insert into DB
  ipcMain.handle(
    IPC_CHANNELS.importConfirm,
    async (evt, req: ImportConfirmRequest): Promise<ImportConfirmResponse> => {
      const win = BrowserWindow.fromWebContents(evt.sender);
      const inserted: ImportConfirmResponse['inserted'] = [];
      const skipped: ImportConfirmResponse['skipped'] = [];

      const totalVerses = req.parseResult.stats.verseCount;
      let versesDone = 0;

      emitProgress(win, {
        phase: 'inserting',
        current: 0,
        total: totalVerses,
        message: 'Writing to database…'
      });

      for (const parsedBook of req.parseResult.books) {
        const key = conflictKey(parsedBook.work, parsedBook.title);
        const resolution = req.conflictResolutions[key];

        // Check existing
        const existing = getBookByTitleAndWork(parsedBook.title, parsedBook.work as Work);
        if (existing) {
          if (resolution === 'skip') {
            skipped.push({ title: parsedBook.title, work: parsedBook.work });
            continue;
          }
          if (resolution === 'overwrite') {
            deleteBook(existing.id);
          } else {
            // No resolution specified for an existing book: default to skip
            skipped.push({ title: parsedBook.title, work: parsedBook.work });
            continue;
          }
        }

        // Insert book + chapters + verses
        const book = insertBook(parsedBook.title, parsedBook.work as Work, req.parseResult.sourceFile);

        let bookVerseCount = 0;
        const verseRows: BulkVerseRow[] = [];
        for (const parsedChapter of parsedBook.chapters) {
          const chapter = insertChapter(book.id, parsedChapter.number);
          for (const parsedVerse of parsedChapter.verses) {
            verseRows.push({
              chapter_id: chapter.id,
              number: parsedVerse.number,
              text: parsedVerse.text
            });
            bookVerseCount += 1;
          }
        }

        // Batch insert in chunks so progress events fire
        const CHUNK = 500;
        for (let i = 0; i < verseRows.length; i += CHUNK) {
          const chunk = verseRows.slice(i, i + CHUNK);
          bulkInsertVerses(chunk);
          versesDone += chunk.length;
          emitProgress(win, {
            phase: 'inserting',
            current: versesDone,
            total: totalVerses,
            message: `Inserted ${versesDone} / ${totalVerses} verses`
          });
        }

        inserted.push({
          bookId: book.id,
          title: parsedBook.title,
          work: parsedBook.work,
          verseCount: bookVerseCount
        });
      }

      emitProgress(win, {
        phase: 'done',
        current: totalVerses,
        total: totalVerses,
        message: 'Import complete'
      });

      return { inserted, skipped };
    }
  );
}
