import { getDb } from '../database';
import type { Note } from '../../../src/types/domain';

export function getNotesForVerse(verseId: number): Note[] {
  return getDb()
    .prepare('SELECT id, verse_id, content, created, updated FROM notes WHERE verse_id = ? ORDER BY created DESC')
    .all(verseId) as Note[];
}

export function createNote(verseId: number, content: string): Note {
  const result = getDb()
    .prepare('INSERT INTO notes (verse_id, content) VALUES (?, ?)')
    .run(verseId, content);
  return getDb()
    .prepare('SELECT id, verse_id, content, created, updated FROM notes WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Note;
}

export function updateNote(noteId: number, content: string): void {
  getDb()
    .prepare("UPDATE notes SET content = ?, updated = datetime('now') WHERE id = ?")
    .run(content, noteId);
}

export function deleteNote(noteId: number): void {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(noteId);
}
