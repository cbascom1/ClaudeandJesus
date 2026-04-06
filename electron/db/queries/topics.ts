import { getDb } from '../database';
import type { Topic, VerseTopic, Work } from '../../../src/types/domain';

// ---------- Topic CRUD ----------

export function getAllTopics(): Topic[] {
  return getDb()
    .prepare('SELECT id, name, color FROM topics ORDER BY name')
    .all() as Topic[];
}

export function getTopicById(id: number): Topic | null {
  const row = getDb()
    .prepare('SELECT id, name, color FROM topics WHERE id = ?')
    .get(id) as Topic | undefined;
  return row ?? null;
}

export function createTopic(name: string, color: string): Topic {
  const result = getDb()
    .prepare('INSERT INTO topics (name, color) VALUES (?, ?)')
    .run(name, color);
  return { id: Number(result.lastInsertRowid), name, color };
}

export function updateTopic(id: number, name: string, color: string): void {
  getDb()
    .prepare('UPDATE topics SET name = ?, color = ? WHERE id = ?')
    .run(name, color, id);
}

export function deleteTopic(id: number): void {
  // verse_topics has ON DELETE CASCADE on topic_id FK, so tagging rows
  // are automatically removed.
  getDb().prepare('DELETE FROM topics WHERE id = ?').run(id);
}

/**
 * Merge `sourceId` into `targetId`: reassign all verse_topics from source to
 * target (skipping duplicates via INSERT OR IGNORE), then delete the source.
 */
export function mergeTopics(sourceId: number, targetId: number): void {
  const db = getDb();
  db.transaction(() => {
    // Move verse associations — skip any that already exist on the target.
    db.prepare(
      `INSERT OR IGNORE INTO verse_topics (verse_id, topic_id, source, confirmed)
       SELECT verse_id, ?, source, confirmed
         FROM verse_topics
        WHERE topic_id = ?`
    ).run(targetId, sourceId);

    // Delete source (cascades remaining verse_topics for source).
    db.prepare('DELETE FROM topics WHERE id = ?').run(sourceId);
  })();
}

// ---------- Verse-Topic associations ----------

export function getTopicsForVerse(verseId: number): (Topic & { source: string; confirmed: number })[] {
  return getDb()
    .prepare(
      `SELECT t.id, t.name, t.color, vt.source, vt.confirmed
         FROM verse_topics vt
         JOIN topics t ON t.id = vt.topic_id
        WHERE vt.verse_id = ?
        ORDER BY t.name`
    )
    .all(verseId) as (Topic & { source: string; confirmed: number })[];
}

export function addTopicToVerse(
  verseId: number,
  topicId: number,
  source: 'manual' | 'ai' = 'manual'
): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO verse_topics (verse_id, topic_id, source, confirmed)
       VALUES (?, ?, ?, 1)`
    )
    .run(verseId, topicId, source);
}

export function removeTopicFromVerse(verseId: number, topicId: number): void {
  getDb()
    .prepare('DELETE FROM verse_topics WHERE verse_id = ? AND topic_id = ?')
    .run(verseId, topicId);
}

// ---------- Topic Explorer queries ----------

export interface TopicStat {
  id: number;
  name: string;
  color: string;
  verse_count: number;
}

/** All topics with their tagged verse counts, sorted by count descending. */
export function getTopicStats(): TopicStat[] {
  return getDb()
    .prepare(
      `SELECT t.id, t.name, t.color, COUNT(vt.verse_id) AS verse_count
         FROM topics t
         LEFT JOIN verse_topics vt ON vt.topic_id = t.id
        GROUP BY t.id
        ORDER BY verse_count DESC, t.name`
    )
    .all() as TopicStat[];
}

export interface TopicVerseRow {
  verse_id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  text: string;
  source: string;
  confirmed: number;
}

/** All verses tagged with a given topic, grouped by book. */
export function getVersesForTopic(topicId: number): TopicVerseRow[] {
  return getDb()
    .prepare(
      `SELECT v.id AS verse_id, v.chapter_id, c.book_id, v.number AS verse_number,
              c.number AS chapter_number, b.title AS book_title, b.work AS book_work,
              v.text, vt.source, vt.confirmed
         FROM verse_topics vt
         JOIN verses   v ON v.id = vt.verse_id
         JOIN chapters c ON c.id = v.chapter_id
         JOIN books    b ON b.id = c.book_id
        WHERE vt.topic_id = ?
        ORDER BY b.work, b.title, c.number, v.number`
    )
    .all(topicId) as TopicVerseRow[];
}

// ---------- Verse highlight color ----------

export function setVerseHighlightColor(verseId: number, color: string | null): void {
  getDb()
    .prepare('UPDATE verses SET highlight_color = ? WHERE id = ?')
    .run(color, verseId);
}

export function getVerseHighlightColor(verseId: number): string | null {
  const row = getDb()
    .prepare('SELECT highlight_color FROM verses WHERE id = ?')
    .get(verseId) as { highlight_color: string | null } | undefined;
  return row?.highlight_color ?? null;
}
