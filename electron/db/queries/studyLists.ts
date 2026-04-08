import { getDb } from '../database';
import type { StudyList, Work } from '../../../src/types/domain';

// ---------- Study List CRUD ----------

export function getAllStudyLists(): StudyList[] {
  return getDb()
    .prepare('SELECT id, name, description, created FROM study_lists ORDER BY created DESC')
    .all() as StudyList[];
}

export function createStudyList(name: string, description: string | null): StudyList {
  const result = getDb()
    .prepare('INSERT INTO study_lists (name, description) VALUES (?, ?)')
    .run(name, description);
  return getDb()
    .prepare('SELECT id, name, description, created FROM study_lists WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as StudyList;
}

export function updateStudyList(id: number, name: string, description: string | null): void {
  getDb()
    .prepare('UPDATE study_lists SET name = ?, description = ? WHERE id = ?')
    .run(name, description, id);
}

export function deleteStudyList(id: number): void {
  getDb().prepare('DELETE FROM study_lists WHERE id = ?').run(id);
}

// ---------- Study List Verses ----------

export interface StudyListVerseRow {
  verse_id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  text: string;
  sort_order: number;
}

export function getStudyListVerses(listId: number): StudyListVerseRow[] {
  return getDb()
    .prepare(
      `SELECT v.id AS verse_id, v.chapter_id, c.book_id, v.number AS verse_number,
              c.number AS chapter_number, b.title AS book_title, b.work AS book_work,
              v.text, slv.sort_order
         FROM study_list_verses slv
         JOIN verses   v ON v.id = slv.verse_id
         JOIN chapters c ON c.id = v.chapter_id
         JOIN books    b ON b.id = c.book_id
        WHERE slv.study_list_id = ?
        ORDER BY slv.sort_order`
    )
    .all(listId) as StudyListVerseRow[];
}

export function addVerseToStudyList(listId: number, verseId: number): void {
  // Auto-assign sort_order as max + 1
  const row = getDb()
    .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM study_list_verses WHERE study_list_id = ?')
    .get(listId) as { next: number };
  getDb()
    .prepare('INSERT OR IGNORE INTO study_list_verses (study_list_id, verse_id, sort_order) VALUES (?, ?, ?)')
    .run(listId, verseId, row.next);
}

export function removeVerseFromStudyList(listId: number, verseId: number): void {
  getDb()
    .prepare('DELETE FROM study_list_verses WHERE study_list_id = ? AND verse_id = ?')
    .run(listId, verseId);
}

export function reorderStudyListVerse(listId: number, verseId: number, newOrder: number): void {
  getDb()
    .prepare('UPDATE study_list_verses SET sort_order = ? WHERE study_list_id = ? AND verse_id = ?')
    .run(newOrder, listId, verseId);
}

export interface StudyListStat {
  id: number;
  name: string;
  description: string | null;
  created: string;
  verse_count: number;
}

export function getStudyListStats(): StudyListStat[] {
  return getDb()
    .prepare(
      `SELECT sl.id, sl.name, sl.description, sl.created,
              COUNT(slv.verse_id) AS verse_count
         FROM study_lists sl
         LEFT JOIN study_list_verses slv ON slv.study_list_id = sl.id
        GROUP BY sl.id
        ORDER BY sl.created DESC`
    )
    .all() as StudyListStat[];
}
