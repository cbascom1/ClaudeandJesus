import bookData from '../../scripts/book-names.json';
import type { Work } from '../../src/types/domain';

interface BookEntry {
  title: string;
  work: Work;
  aliases: string[];
}

interface BookNamesFile {
  description: string;
  books: BookEntry[];
}

const DATA = bookData as BookNamesFile;

/** Normalize a string for case/whitespace-insensitive comparison. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,:;]+$/g, '');
}

// Build a lookup map: normalized name → {title, work}
const LOOKUP = new Map<string, { title: string; work: Work }>();
for (const book of DATA.books) {
  LOOKUP.set(normalize(book.title), { title: book.title, work: book.work });
  for (const alias of book.aliases) {
    LOOKUP.set(normalize(alias), { title: book.title, work: book.work });
  }
}

/**
 * Try to match a line to a known book. Returns canonical {title, work} or null.
 * Case-insensitive, whitespace-tolerant.
 */
export function lookupBook(line: string): { title: string; work: Work } | null {
  const key = normalize(line);
  return LOOKUP.get(key) ?? null;
}

/** Returns all canonical book titles for a given work. */
export function booksInWork(work: Work): string[] {
  return DATA.books.filter((b) => b.work === work).map((b) => b.title);
}
