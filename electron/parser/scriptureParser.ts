/**
 * Scripture text parser — line-oriented state machine.
 *
 * Accepts plain-text scripture files organized as:
 *     BOOK NAME
 *     Chapter N
 *     1 Verse text here...
 *     2 Another verse...
 *     [blank line]
 *     Chapter N+1
 *     ...
 *
 * Recognizes chapter markers in multiple forms (Chapter N, Psalm N, Section N),
 * supports multi-line verses, and is tolerant of whitespace variations.
 */

import { basename } from 'node:path';
import { lookupBook } from './bookDictionary';
import type {
  ParsedBook,
  ParsedChapter,
  ParsedVerse,
  ParseResult,
  ParseWarning
} from './types';
import type { Work } from '../../src/types/domain';

type State = 'SEEKING_BOOK' | 'IN_BOOK' | 'IN_CHAPTER' | 'ACCUMULATING_VERSE';

const RE_CHAPTER_MARKER = /^\s*(Psalm|Section|Chapter)\s+(\d+)\s*$/i;
const RE_VERSE_START = /^\s*(\d+)[\s.)\]]+(.+)$/;

interface ParserContext {
  state: State;
  currentBook: ParsedBook | null;
  currentChapter: ParsedChapter | null;
  currentVerse: ParsedVerse | null;
  warnings: ParseWarning[];
  books: ParsedBook[];
}

/** Entry point: parse scripture text into structured ParseResult. */
export function parseScriptureText(text: string, filePath: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const ctx: ParserContext = {
    state: 'SEEKING_BOOK',
    currentBook: null,
    currentChapter: null,
    currentVerse: null,
    warnings: [],
    books: []
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const lineNum = i + 1;
    const line = rawLine.trim();

    if (line === '') {
      // Blank line: flush any in-progress verse (it's complete now)
      flushVerse(ctx);
      continue;
    }

    // Classification — first match wins
    const chapterMatch = line.match(RE_CHAPTER_MARKER);
    if (chapterMatch && chapterMatch[2]) {
      handleChapterMarker(ctx, parseInt(chapterMatch[2], 10), lineNum);
      continue;
    }

    const verseMatch = line.match(RE_VERSE_START);
    if (verseMatch && verseMatch[1] && verseMatch[2] && (ctx.state === 'IN_CHAPTER' || ctx.state === 'ACCUMULATING_VERSE')) {
      handleVerseStart(ctx, parseInt(verseMatch[1], 10), verseMatch[2].trim(), lineNum);
      continue;
    }

    // Try book header lookup
    const bookMatch = lookupBook(line);
    if (bookMatch) {
      handleBookHeader(ctx, bookMatch.title, bookMatch.work);
      continue;
    }

    // Continuation line: append to current verse if accumulating
    if (ctx.state === 'ACCUMULATING_VERSE' && ctx.currentVerse) {
      ctx.currentVerse.text = `${ctx.currentVerse.text} ${line}`.replace(/\s+/g, ' ').trim();
      continue;
    }

    // If we see a plain verse line before any book/chapter context, it's an orphan
    if (verseMatch && !ctx.currentChapter) {
      ctx.warnings.push({
        line: lineNum,
        type: 'orphan_verse',
        message: `Verse-like line before any chapter context: "${line.slice(0, 60)}"`
      });
      continue;
    }

    // Unknown line type — record as warning if we're in a book context without chapter
    if (ctx.state === 'IN_BOOK') {
      ctx.warnings.push({
        line: lineNum,
        type: 'unknown_book',
        message: `Unrecognized line in book preamble: "${line.slice(0, 60)}"`
      });
    }
  }

  // Final flush
  flushVerse(ctx);
  flushChapter(ctx);
  flushBook(ctx);

  // Compute stats
  const bookCount = ctx.books.length;
  const chapterCount = ctx.books.reduce((sum, b) => sum + b.chapters.length, 0);
  const verseCount = ctx.books.reduce(
    (sum, b) => sum + b.chapters.reduce((s, c) => s + c.verses.length, 0),
    0
  );

  // Detect verse gaps in post-processing
  for (const book of ctx.books) {
    for (const chapter of book.chapters) {
      detectVerseGaps(book.title, chapter, ctx.warnings);
    }
  }

  return {
    books: ctx.books,
    stats: { bookCount, chapterCount, verseCount },
    warnings: ctx.warnings,
    errors: [],
    sourceFile: basename(filePath)
  };
}

function handleBookHeader(ctx: ParserContext, title: string, work: Work): void {
  flushVerse(ctx);
  flushChapter(ctx);
  flushBook(ctx);

  ctx.currentBook = { title, work, chapters: [] };
  ctx.state = 'IN_BOOK';
}

function handleChapterMarker(ctx: ParserContext, num: number, lineNum: number): void {
  flushVerse(ctx);
  flushChapter(ctx);

  if (!ctx.currentBook) {
    ctx.warnings.push({
      line: lineNum,
      type: 'orphan_chapter',
      message: `Chapter ${num} encountered before any book header`
    });
    return;
  }
  ctx.currentChapter = { number: num, verses: [] };
  ctx.state = 'IN_CHAPTER';
}

function handleVerseStart(ctx: ParserContext, num: number, text: string, lineNum: number): void {
  flushVerse(ctx);

  if (!ctx.currentChapter) {
    ctx.warnings.push({
      line: lineNum,
      type: 'orphan_verse',
      message: `Verse ${num} encountered outside any chapter`
    });
    return;
  }

  // Check for duplicate verse number within chapter
  if (ctx.currentChapter.verses.some((v) => v.number === num)) {
    ctx.warnings.push({
      line: lineNum,
      type: 'duplicate_verse_number',
      message: `Duplicate verse number ${num} in chapter ${ctx.currentChapter.number}`
    });
  }

  ctx.currentVerse = { number: num, text };
  ctx.state = 'ACCUMULATING_VERSE';
}

function flushVerse(ctx: ParserContext): void {
  if (ctx.currentVerse && ctx.currentChapter) {
    ctx.currentChapter.verses.push(ctx.currentVerse);
  }
  ctx.currentVerse = null;
  if (ctx.state === 'ACCUMULATING_VERSE') ctx.state = 'IN_CHAPTER';
}

function flushChapter(ctx: ParserContext): void {
  if (ctx.currentChapter && ctx.currentBook) {
    if (ctx.currentChapter.verses.length === 0) {
      ctx.warnings.push({
        line: 0,
        type: 'empty_chapter',
        message: `Chapter ${ctx.currentChapter.number} of ${ctx.currentBook.title} has no verses`
      });
    } else {
      ctx.currentBook.chapters.push(ctx.currentChapter);
    }
  }
  ctx.currentChapter = null;
  if (ctx.state === 'IN_CHAPTER') ctx.state = 'IN_BOOK';
}

function flushBook(ctx: ParserContext): void {
  if (ctx.currentBook && ctx.currentBook.chapters.length > 0) {
    ctx.books.push(ctx.currentBook);
  }
  ctx.currentBook = null;
  ctx.state = 'SEEKING_BOOK';
}

function detectVerseGaps(
  bookTitle: string,
  chapter: ParsedChapter,
  warnings: ParseWarning[]
): void {
  const numbers = chapter.verses.map((v) => v.number).sort((a, b) => a - b);
  if (numbers.length === 0 || numbers[0] === undefined) return;
  if (numbers[0] !== 1) {
    warnings.push({
      line: 0,
      type: 'verse_gap',
      message: `${bookTitle} chapter ${chapter.number}: verses start at ${numbers[0]} (expected 1)`
    });
  }
  for (let i = 1; i < numbers.length; i++) {
    const prev = numbers[i - 1];
    const curr = numbers[i];
    if (prev !== undefined && curr !== undefined && curr !== prev + 1) {
      warnings.push({
        line: 0,
        type: 'verse_gap',
        message: `${bookTitle} chapter ${chapter.number}: gap between verse ${prev} and ${curr}`
      });
    }
  }
}
