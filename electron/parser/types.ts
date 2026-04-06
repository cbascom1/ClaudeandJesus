import type { Work } from '../../src/types/domain';

export interface ParsedVerse {
  number: number;
  text: string;
}

export interface ParsedChapter {
  number: number;
  verses: ParsedVerse[];
}

export interface ParsedBook {
  title: string;
  work: Work;
  chapters: ParsedChapter[];
}

export type WarningType =
  | 'unknown_book'
  | 'orphan_verse'
  | 'orphan_chapter'
  | 'verse_gap'
  | 'empty_chapter'
  | 'duplicate_verse_number';

export interface ParseWarning {
  line: number;
  type: WarningType;
  message: string;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseStats {
  bookCount: number;
  chapterCount: number;
  verseCount: number;
}

export interface ParseResult {
  books: ParsedBook[];
  stats: ParseStats;
  warnings: ParseWarning[];
  errors: ParseError[];
  sourceFile: string;
}
