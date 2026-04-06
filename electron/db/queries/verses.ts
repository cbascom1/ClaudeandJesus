import { getDb } from '../database';
import type { Verse, VerseWithRef } from '../../../src/types/domain';

export function getVersesByChapterId(chapterId: number): Verse[] {
  // Omit embedding BLOB from the selection — not needed in the reading view.
  return getDb()
    .prepare('SELECT id, chapter_id, number, text FROM verses WHERE chapter_id = ? ORDER BY number')
    .all(chapterId) as Verse[];
}

export function getVerseById(id: number): VerseWithRef | null {
  const row = getDb()
    .prepare(
      `SELECT v.id, v.chapter_id, v.number, v.text,
              b.title AS book_title, b.work AS book_work, c.number AS chapter_number
         FROM verses v
         JOIN chapters c ON c.id = v.chapter_id
         JOIN books    b ON b.id = c.book_id
        WHERE v.id = ?`
    )
    .get(id) as VerseWithRef | undefined;
  return row ?? null;
}

export function insertVerse(chapterId: number, number: number, text: string): Verse {
  const result = getDb()
    .prepare('INSERT INTO verses (chapter_id, number, text) VALUES (?, ?, ?)')
    .run(chapterId, number, text);
  const id = Number(result.lastInsertRowid);
  return { id, chapter_id: chapterId, number, text };
}

export interface BulkVerseRow {
  chapter_id: number;
  number: number;
  text: string;
}

/** Transactional bulk insert. Caller supplies all verses for one or more chapters. */
export function bulkInsertVerses(verses: BulkVerseRow[]): number {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO verses (chapter_id, number, text) VALUES (?, ?, ?)');
  const tx = db.transaction((rows: BulkVerseRow[]) => {
    for (const row of rows) {
      stmt.run(row.chapter_id, row.number, row.text);
    }
  });
  tx(verses);
  return verses.length;
}

export function countVersesInBook(bookId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM verses v
         JOIN chapters c ON c.id = v.chapter_id
        WHERE c.book_id = ?`
    )
    .get(bookId) as { n: number } | undefined;
  return row?.n ?? 0;
}
