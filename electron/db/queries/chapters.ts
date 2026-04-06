import { getDb } from '../database';
import type { Chapter } from '../../../src/types/domain';

export function getChaptersByBookId(bookId: number): Chapter[] {
  return getDb()
    .prepare('SELECT id, book_id, number FROM chapters WHERE book_id = ? ORDER BY number')
    .all(bookId) as Chapter[];
}

export function getChapter(bookId: number, number: number): Chapter | null {
  const row = getDb()
    .prepare('SELECT id, book_id, number FROM chapters WHERE book_id = ? AND number = ?')
    .get(bookId, number) as Chapter | undefined;
  return row ?? null;
}

export function getChapterById(id: number): Chapter | null {
  const row = getDb()
    .prepare('SELECT id, book_id, number FROM chapters WHERE id = ?')
    .get(id) as Chapter | undefined;
  return row ?? null;
}

export function insertChapter(bookId: number, number: number): Chapter {
  const result = getDb()
    .prepare('INSERT INTO chapters (book_id, number) VALUES (?, ?)')
    .run(bookId, number);
  const id = Number(result.lastInsertRowid);
  return { id, book_id: bookId, number };
}
