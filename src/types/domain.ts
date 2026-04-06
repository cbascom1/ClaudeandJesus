/**
 * Domain types shared between main process (DB results) and renderer (React).
 * Keep in sync with SQLite schema migrations.
 */

export type Work = 'bible' | 'book_of_mormon' | 'dc' | 'pgp';

export interface Book {
  id: number;
  title: string;
  work: Work;
  import_date: string;
  source_file: string | null;
}

export interface Chapter {
  id: number;
  book_id: number;
  number: number;
}

export interface Verse {
  id: number;
  chapter_id: number;
  number: number;
  text: string;
  /** Present in DB as BLOB; normally omitted from IPC payloads for size. */
  embedding?: Uint8Array | null;
}

export interface VerseWithRef extends Verse {
  book_title: string;
  book_work: Work;
  chapter_number: number;
}

export interface Topic {
  id: number;
  name: string;
  color: string;
}

export interface VerseTopic {
  verse_id: number;
  topic_id: number;
  source: 'ai' | 'manual';
  confirmed: 0 | 1;
}

export interface CrossReference {
  id: number;
  source_verse: number;
  target_verse: number;
  note: string | null;
}

export interface Note {
  id: number;
  verse_id: number;
  content: string;
  created: string;
  updated: string;
}

export interface StudyList {
  id: number;
  name: string;
  description: string | null;
  created: string;
}

export interface StudyListVerse {
  study_list_id: number;
  verse_id: number;
  sort_order: number;
}

/** Canon labels for display */
export const WORK_LABELS: Record<Work, string> = {
  bible: 'King James Bible',
  book_of_mormon: 'Book of Mormon',
  dc: 'Doctrine & Covenants',
  pgp: 'Pearl of Great Price'
};
