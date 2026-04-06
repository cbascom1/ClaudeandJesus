import { getDb } from '../database';
import type { Work } from '../../../src/types/domain';

export interface SearchResultRow {
  verse_id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  /** Full verse text with matches wrapped in «…» delimiters (rendered client-side). */
  highlighted: string;
  /** Bare verse text, unhighlighted. */
  text: string;
  /** FTS5 rank score (lower = better match). */
  rank: number;
}

export interface SearchFilters {
  works?: Work[];
  bookIds?: number[];
}

/**
 * Convert a user's query string into an FTS5 MATCH expression.
 *
 * Strategy: tokenize on whitespace, double-quote each token (escaping embedded
 * quotes by doubling them), then join with spaces. FTS5 treats space as implicit
 * AND, so this gives "all words must match" semantics — the intuitive default
 * for scripture search. Strips punctuation that FTS5 would otherwise treat as
 * syntax (parens, colons, etc.) when not already quoted by the user.
 *
 * If the user's raw input already contains FTS5 operators (AND/OR/NOT) or
 * explicit double-quoted phrases, we respect those and just sanitize each
 * quoted phrase.
 */
export function buildFtsQuery(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Detect user-authored operator syntax. If present, pass through as-is after
  // a light sanitization pass that ensures every double-quote is balanced.
  const hasOperators = /\b(AND|OR|NOT|NEAR)\b/.test(trimmed) || trimmed.includes('"');
  if (hasOperators) {
    // Quick safety check: balance double-quotes by appending one if odd count.
    const quoteCount = (trimmed.match(/"/g) ?? []).length;
    return quoteCount % 2 === 1 ? trimmed + '"' : trimmed;
  }

  // Simple mode: split on whitespace, keep word chars + apostrophes, quote each token.
  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}'*]/gu, ''))
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(' ');
}

/**
 * Execute a full-text search against verses.
 *
 * `limit` caps result count (default 200); `filters.works` and `filters.bookIds`
 * restrict to the given canons/books.
 */
export function searchVerses(
  rawQuery: string,
  filters: SearchFilters = {},
  limit = 200
): SearchResultRow[] {
  const ftsQuery = buildFtsQuery(rawQuery);
  if (!ftsQuery) return [];

  const whereClauses: string[] = ['verses_fts MATCH ?'];
  const params: unknown[] = [ftsQuery];

  if (filters.works && filters.works.length > 0) {
    whereClauses.push(
      `b.work IN (${filters.works.map(() => '?').join(',')})`
    );
    params.push(...filters.works);
  }
  if (filters.bookIds && filters.bookIds.length > 0) {
    whereClauses.push(
      `b.id IN (${filters.bookIds.map(() => '?').join(',')})`
    );
    params.push(...filters.bookIds);
  }

  const sql = `
    SELECT
      v.id AS verse_id,
      v.chapter_id AS chapter_id,
      c.book_id AS book_id,
      v.number AS verse_number,
      c.number AS chapter_number,
      b.title AS book_title,
      b.work AS book_work,
      highlight(verses_fts, 0, '«', '»') AS highlighted,
      v.text AS text,
      verses_fts.rank AS rank
    FROM verses_fts
    JOIN verses   v ON v.id = verses_fts.rowid
    JOIN chapters c ON c.id = v.chapter_id
    JOIN books    b ON b.id = c.book_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY verses_fts.rank
    LIMIT ?
  `;
  params.push(limit);

  try {
    return getDb().prepare(sql).all(...params) as SearchResultRow[];
  } catch (err) {
    // FTS5 throws a SQLite error on malformed MATCH expressions (e.g. dangling
    // operators). Surface an empty result rather than crashing the renderer.
    console.error('[search] FTS5 query failed:', err, 'query:', ftsQuery);
    return [];
  }
}
