import { getDb } from '../database';
import type { Book, Work } from '../../../src/types/domain';

export function getAllBooks(): Book[] {
  return getDb()
    .prepare('SELECT id, title, work, import_date, source_file FROM books ORDER BY work, id')
    .all() as Book[];
}

export function getBookById(id: number): Book | null {
  const row = getDb()
    .prepare('SELECT id, title, work, import_date, source_file FROM books WHERE id = ?')
    .get(id) as Book | undefined;
  return row ?? null;
}

export function getBookByTitleAndWork(title: string, work: Work): Book | null {
  const row = getDb()
    .prepare(
      'SELECT id, title, work, import_date, source_file FROM books WHERE title = ? AND work = ?'
    )
    .get(title, work) as Book | undefined;
  return row ?? null;
}

export function insertBook(title: string, work: Work, sourceFile: string | null): Book {
  const result = getDb()
    .prepare('INSERT INTO books (title, work, source_file) VALUES (?, ?, ?)')
    .run(title, work, sourceFile);
  const id = Number(result.lastInsertRowid);
  const book = getBookById(id);
  if (!book) throw new Error(`Failed to insert book: ${title}`);
  return book;
}

export function deleteBook(id: number): void {
  getDb().prepare('DELETE FROM books WHERE id = ?').run(id);
}
