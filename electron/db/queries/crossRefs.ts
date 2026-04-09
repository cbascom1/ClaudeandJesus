import { getDb } from '../database';
import type { Work } from '../../../src/types/domain';

export interface CrossRefRow {
  id: number;
  linked_verse_id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  text: string;
  note: string | null;
  direction: 'outgoing' | 'incoming';
}

/**
 * Get all cross-references for a verse (both directions).
 * Returns the "other" verse's details for display.
 */
export function getCrossRefsForVerse(verseId: number): CrossRefRow[] {
  return getDb()
    .prepare(
      `SELECT cr.id, v.id AS linked_verse_id, v.chapter_id, c.book_id,
              v.number AS verse_number, c.number AS chapter_number,
              b.title AS book_title, b.work AS book_work, v.text, cr.note,
              CASE WHEN cr.source_verse = ? THEN 'outgoing' ELSE 'incoming' END AS direction
         FROM cross_references cr
         JOIN verses   v ON v.id = CASE WHEN cr.source_verse = ? THEN cr.target_verse ELSE cr.source_verse END
         JOIN chapters c ON c.id = v.chapter_id
         JOIN books    b ON b.id = c.book_id
        WHERE cr.source_verse = ? OR cr.target_verse = ?
        ORDER BY b.work, b.title, c.number, v.number`
    )
    .all(verseId, verseId, verseId, verseId) as CrossRefRow[];
}

export function addCrossRef(sourceVerseId: number, targetVerseId: number, note: string | null): number {
  const result = getDb()
    .prepare('INSERT OR IGNORE INTO cross_references (source_verse, target_verse, note) VALUES (?, ?, ?)')
    .run(sourceVerseId, targetVerseId, note);
  return Number(result.lastInsertRowid);
}

export function updateCrossRefNote(id: number, note: string | null): void {
  getDb()
    .prepare('UPDATE cross_references SET note = ? WHERE id = ?')
    .run(note, id);
}

export function removeCrossRef(id: number): void {
  getDb().prepare('DELETE FROM cross_references WHERE id = ?').run(id);
}
