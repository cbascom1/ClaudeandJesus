import { getDb } from '../database';
import type { Work } from '../../../src/types/domain';

// ---------------------------------------------------------------------------
// Embedding storage
// ---------------------------------------------------------------------------

/** Save a 384-dim Float32 embedding for a verse. */
export function saveEmbedding(verseId: number, embedding: number[]): void {
  const buf = Buffer.from(new Float32Array(embedding).buffer);
  getDb()
    .prepare('UPDATE verses SET embedding = ? WHERE id = ?')
    .run(buf, verseId);
}

/** Batch-save embeddings. Expects array of { verseId, embedding }. */
export function batchSaveEmbeddings(
  rows: Array<{ verseId: number; embedding: number[] }>
): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE verses SET embedding = ? WHERE id = ?');
  const tx = db.transaction((items: typeof rows) => {
    for (const { verseId, embedding } of items) {
      const buf = Buffer.from(new Float32Array(embedding).buffer);
      stmt.run(buf, verseId);
    }
  });
  tx(rows);
}

/** Count verses that have embeddings. */
export function countEmbedded(): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM verses WHERE embedding IS NOT NULL')
    .get() as { n: number };
  return row.n;
}

/** Count total verses. */
export function countTotalVerses(): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM verses')
    .get() as { n: number };
  return row.n;
}

// ---------------------------------------------------------------------------
// Semantic search — cosine similarity in JS
// ---------------------------------------------------------------------------

interface EmbeddedVerseRow {
  id: number;
  chapter_id: number;
  number: number;
  text: string;
  embedding: Buffer;
}

interface SemanticVerseRow {
  id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  text: string;
  embedding: Buffer;
}

export interface SemanticSearchResult {
  verse_id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  text: string;
  score: number; // cosine similarity [0, 1]
}

/**
 * Semantic search: compute cosine similarity between `queryEmbedding` and all
 * verse embeddings in the DB.
 *
 * Since embeddings are pre-normalized (unit vectors), cosine similarity = dot product.
 * For ~32k verses with 384 dims this completes in <50ms on modern hardware.
 */
export function semanticSearch(
  queryEmbedding: number[],
  filters: { works?: Work[] } = {},
  limit = 50
): SemanticSearchResult[] {
  const db = getDb();

  let sql = `
    SELECT v.id, v.chapter_id, c.book_id, v.number AS verse_number,
           c.number AS chapter_number, b.title AS book_title, b.work AS book_work,
           v.text, v.embedding
      FROM verses v
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books    b ON b.id = c.book_id
     WHERE v.embedding IS NOT NULL
  `;
  const params: unknown[] = [];

  if (filters.works && filters.works.length > 0) {
    sql += ` AND b.work IN (${filters.works.map(() => '?').join(',')})`;
    params.push(...filters.works);
  }

  const rows = db.prepare(sql).all(...params) as SemanticVerseRow[];

  const queryVec = new Float32Array(queryEmbedding);
  const scored: SemanticSearchResult[] = [];

  for (const row of rows) {
    const verseVec = new Float32Array(
      row.embedding.buffer,
      row.embedding.byteOffset,
      row.embedding.byteLength / 4
    );
    // Dot product (vectors are L2-normalized).
    let dot = 0;
    for (let i = 0; i < queryVec.length; i++) {
      dot += queryVec[i] * verseVec[i];
    }
    scored.push({
      verse_id: row.id,
      chapter_id: row.chapter_id,
      book_id: row.book_id,
      verse_number: row.verse_number,
      chapter_number: row.chapter_number,
      book_title: row.book_title,
      book_work: row.book_work,
      text: row.text,
      score: Math.max(0, Math.min(1, dot)) // clamp to [0, 1]
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Return verse IDs that do NOT yet have embeddings, in batches.
 * Used to identify which verses need embedding generation.
 */
export function getUnembeddedVerseIds(batchSize = 500): Array<{ id: number; text: string }> {
  return getDb()
    .prepare(
      `SELECT id, text FROM verses WHERE embedding IS NULL ORDER BY id LIMIT ?`
    )
    .all(batchSize) as Array<{ id: number; text: string }>;
}
