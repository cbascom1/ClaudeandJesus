// Quick sanity test for the scripture parser.
// Run with: node scripts/test-parser.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the book dictionary
const bookData = JSON.parse(
  readFileSync(join(__dirname, 'book-names.json'), 'utf-8')
);

function normalize(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,:;]+$/g, '');
}

const LOOKUP = new Map();
for (const book of bookData.books) {
  LOOKUP.set(normalize(book.title), { title: book.title, work: book.work });
  for (const alias of book.aliases) {
    LOOKUP.set(normalize(alias), { title: book.title, work: book.work });
  }
}

function lookupBook(line) {
  return LOOKUP.get(normalize(line)) ?? null;
}

const RE_CHAPTER = /^\s*(Psalm|Section|Chapter)\s+(\d+)\s*$/i;
const RE_VERSE = /^\s*(\d+)[\s.)\]]+(.+)$/;

function parseScripture(text, filePath) {
  const lines = text.split(/\r?\n/);
  let state = 'SEEKING_BOOK';
  let currentBook = null;
  let currentChapter = null;
  let currentVerse = null;
  const books = [];
  const warnings = [];

  const flushVerse = () => {
    if (currentVerse && currentChapter) currentChapter.verses.push(currentVerse);
    currentVerse = null;
    if (state === 'ACCUMULATING_VERSE') state = 'IN_CHAPTER';
  };
  const flushChapter = () => {
    if (currentChapter && currentBook && currentChapter.verses.length > 0) {
      currentBook.chapters.push(currentChapter);
    }
    currentChapter = null;
    if (state === 'IN_CHAPTER') state = 'IN_BOOK';
  };
  const flushBook = () => {
    if (currentBook && currentBook.chapters.length > 0) books.push(currentBook);
    currentBook = null;
    state = 'SEEKING_BOOK';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      flushVerse();
      continue;
    }

    const chMatch = line.match(RE_CHAPTER);
    if (chMatch) {
      flushVerse();
      flushChapter();
      if (currentBook) {
        currentChapter = { number: parseInt(chMatch[2], 10), verses: [] };
        state = 'IN_CHAPTER';
      }
      continue;
    }

    const vMatch = line.match(RE_VERSE);
    if (vMatch && (state === 'IN_CHAPTER' || state === 'ACCUMULATING_VERSE')) {
      flushVerse();
      if (currentChapter) {
        currentVerse = { number: parseInt(vMatch[1], 10), text: vMatch[2].trim() };
        state = 'ACCUMULATING_VERSE';
      }
      continue;
    }

    const bookMatch = lookupBook(line);
    if (bookMatch) {
      flushVerse();
      flushChapter();
      flushBook();
      currentBook = { title: bookMatch.title, work: bookMatch.work, chapters: [] };
      state = 'IN_BOOK';
      continue;
    }

    if (state === 'ACCUMULATING_VERSE' && currentVerse) {
      currentVerse.text = `${currentVerse.text} ${line}`.replace(/\s+/g, ' ').trim();
    }
  }
  flushVerse();
  flushChapter();
  flushBook();

  return { books, warnings };
}

// Run against samples
const samples = ['sample-genesis.txt', '1nephi'.startsWith('1') ? 'sample-1nephi.txt' : ''];
for (const name of samples) {
  const path = join(__dirname, '..', 'samples', name);
  const text = readFileSync(path, 'utf-8');
  const result = parseScripture(text, path);
  console.log(`\n=== ${name} ===`);
  for (const book of result.books) {
    console.log(`Book: ${book.title} (${book.work})`);
    for (const ch of book.chapters) {
      console.log(`  Chapter ${ch.number}: ${ch.verses.length} verse(s)`);
      for (const v of ch.verses) {
        console.log(`    ${v.number}: ${v.text.slice(0, 60)}...`);
      }
    }
  }
}
