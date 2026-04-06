/**
 * Mock implementation of `window.api` for browser preview / visual validation.
 *
 * When the app runs inside Electron, the preload script exposes the real
 * IPC-backed API. When it runs in a plain browser (via `vite.renderer.config.mjs`),
 * `window.api` is undefined, so we install this stub. Data is small and static —
 * just enough to exercise every UI state.
 */
import type { WindowApi, SearchResult, SearchFilters, TopicWithMeta, TopicStat, TopicVerseRow } from './types/ipc';
import type { Book, Chapter, Verse, VerseWithRef, Topic } from './types/domain';

const BOOKS: Book[] = [
  { id: 1, title: 'Genesis', work: 'bible', import_date: '2026-04-05', source_file: null },
  { id: 2, title: 'Matthew', work: 'bible', import_date: '2026-04-05', source_file: null },
  { id: 3, title: '1 Nephi', work: 'book_of_mormon', import_date: '2026-04-05', source_file: null },
  { id: 4, title: 'Alma', work: 'book_of_mormon', import_date: '2026-04-05', source_file: null }
];

const CHAPTERS: Chapter[] = [
  { id: 101, book_id: 1, number: 1 },
  { id: 102, book_id: 1, number: 2 },
  { id: 201, book_id: 2, number: 1 },
  { id: 301, book_id: 3, number: 1 },
  { id: 401, book_id: 4, number: 32 }
];

const VERSES: Record<number, Verse[]> = {
  101: [
    { id: 1001, chapter_id: 101, number: 1, text: 'In the beginning God created the heaven and the earth.' },
    { id: 1002, chapter_id: 101, number: 2, text: 'And the earth was without form, and void; and darkness was upon the face of the deep.' },
    { id: 1003, chapter_id: 101, number: 3, text: 'And God said, Let there be light: and there was light.' },
    { id: 1004, chapter_id: 101, number: 4, text: 'And God saw the light, that it was good: and God divided the light from the darkness.' }
  ],
  102: [
    { id: 1011, chapter_id: 102, number: 1, text: 'Thus the heavens and the earth were finished, and all the host of them.' },
    { id: 1012, chapter_id: 102, number: 3, text: 'And God blessed the seventh day, and sanctified it.' }
  ],
  201: [
    { id: 2001, chapter_id: 201, number: 1, text: 'The book of the generation of Jesus Christ, the son of David, the son of Abraham.' }
  ],
  301: [
    { id: 3001, chapter_id: 301, number: 1, text: 'I, Nephi, having been born of goodly parents, therefore I was taught somewhat in all the learning of my father.' }
  ],
  401: [
    { id: 4001, chapter_id: 401, number: 21, text: 'And now, as I said concerning faith—faith is not to have a perfect knowledge of things; therefore if ye have faith ye hope for things which are not seen, which are true.' }
  ]
};

const BOOK_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));
const CHAPTER_BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));

// Mock topic data
const MOCK_TOPICS: Topic[] = [
  { id: 1, name: 'Creation', color: '#4ADE80' },
  { id: 2, name: 'Faith', color: '#3B82F6' },
  { id: 3, name: 'Jesus Christ', color: '#B91C1C' },
  { id: 4, name: 'Light', color: '#FDE047' },
  { id: 5, name: 'Obedience', color: '#6366F1' }
];
let nextTopicId = 6;
const verseTopicMap = new Map<number, number[]>([
  [1001, [1, 3]],     // Gen 1:1 → Creation, Jesus Christ
  [1003, [1, 4]],     // Gen 1:3 → Creation, Light
  [4001, [2]]         // Alma 32:21 → Faith
]);

function mockSearch(query: string, filters: SearchFilters): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const out: SearchResult[] = [];
  for (const [chapterIdStr, verses] of Object.entries(VERSES)) {
    const chapterId = Number(chapterIdStr);
    const chapter = CHAPTER_BY_ID.get(chapterId);
    if (!chapter) continue;
    const book = BOOK_BY_ID.get(chapter.book_id);
    if (!book) continue;
    if (filters.works && filters.works.length > 0 && !filters.works.includes(book.work)) continue;

    for (const v of verses) {
      const text = v.text.toLowerCase();
      if (!terms.every((t) => text.includes(t))) continue;

      // Wrap all term occurrences in the delimiters the real search uses
      let highlighted = v.text;
      for (const t of terms) {
        const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlighted = highlighted.replace(re, '«$1»');
      }

      out.push({
        verse_id: v.id,
        chapter_id: chapterId,
        book_id: book.id,
        verse_number: v.number,
        chapter_number: chapter.number,
        book_title: book.title,
        book_work: book.work,
        highlighted,
        text: v.text,
        rank: 1
      });
    }
  }
  return out;
}

export const MOCK_API: WindowApi = {
  db: {
    getBooks: async () => BOOKS,
    getChaptersByBook: async (bookId) => CHAPTERS.filter((c) => c.book_id === bookId),
    getVersesByChapter: async (chapterId) => VERSES[chapterId] ?? [],
    getVerseById: async (verseId) => {
      for (const verses of Object.values(VERSES)) {
        const v = verses.find((x) => x.id === verseId);
        if (!v) continue;
        const ch = CHAPTER_BY_ID.get(v.chapter_id);
        const bk = ch ? BOOK_BY_ID.get(ch.book_id) : undefined;
        if (!ch || !bk) return null;
        const out: VerseWithRef = {
          ...v,
          book_title: bk.title,
          book_work: bk.work,
          chapter_number: ch.number
        };
        return out;
      }
      return null;
    },
    searchVerses: async (query, filters) => mockSearch(query, filters)
  },
  topics: {
    getAll: async () => MOCK_TOPICS,
    create: async (name, color) => {
      const t: Topic = { id: nextTopicId++, name, color };
      MOCK_TOPICS.push(t);
      return t;
    },
    update: async (id, name, color) => {
      const t = MOCK_TOPICS.find((x) => x.id === id);
      if (t) { t.name = name; t.color = color; }
    },
    remove: async (id) => {
      const idx = MOCK_TOPICS.findIndex((x) => x.id === id);
      if (idx >= 0) MOCK_TOPICS.splice(idx, 1);
      for (const [k, v] of verseTopicMap.entries()) {
        verseTopicMap.set(k, v.filter((tid) => tid !== id));
      }
    },
    merge: async () => {},
    getForVerse: async (verseId) => {
      const ids = verseTopicMap.get(verseId) ?? [];
      return ids.map((tid) => {
        const t = MOCK_TOPICS.find((x) => x.id === tid);
        return t ? { ...t, source: 'manual', confirmed: 1 } as TopicWithMeta : null;
      }).filter(Boolean) as TopicWithMeta[];
    },
    addToVerse: async (verseId, topicId) => {
      const existing = verseTopicMap.get(verseId) ?? [];
      if (!existing.includes(topicId)) verseTopicMap.set(verseId, [...existing, topicId]);
    },
    removeFromVerse: async (verseId, topicId) => {
      const existing = verseTopicMap.get(verseId) ?? [];
      verseTopicMap.set(verseId, existing.filter((id) => id !== topicId));
    },
    getStats: async () => {
      return MOCK_TOPICS.map((t) => {
        let count = 0;
        for (const ids of verseTopicMap.values()) if (ids.includes(t.id)) count++;
        return { ...t, verse_count: count } as TopicStat;
      }).sort((a, b) => b.verse_count - a.verse_count);
    },
    getVersesForTopic: async (topicId) => {
      const rows: TopicVerseRow[] = [];
      for (const [verseId, ids] of verseTopicMap.entries()) {
        if (!ids.includes(topicId)) continue;
        for (const verses of Object.values(VERSES)) {
          const v = verses.find((x) => x.id === verseId);
          if (!v) continue;
          const ch = CHAPTER_BY_ID.get(v.chapter_id);
          const bk = ch ? BOOK_BY_ID.get(ch.book_id) : undefined;
          if (!ch || !bk) continue;
          rows.push({
            verse_id: v.id, chapter_id: ch.id, book_id: bk.id,
            verse_number: v.number, chapter_number: ch.number,
            book_title: bk.title, book_work: bk.work, text: v.text,
            source: 'manual', confirmed: 1
          });
        }
      }
      return rows;
    },
    setVerseHighlight: async () => {}
  },
  import: {
    pickFile: async () => null,
    parseFile: async () => ({
      books: [],
      stats: { bookCount: 0, chapterCount: 0, verseCount: 0 },
      warnings: [],
      errors: [],
      sourceFile: ''
    }),
    detectConflicts: async () => [],
    confirmImport: async () => ({ inserted: [], skipped: [] }),
    onProgress: () => () => undefined
  },
  app: {
    getVersion: async () => '0.1.0-preview'
  }
};

/** Install the mock if `window.api` hasn't been provided by Electron preload. */
export function installMockApiIfMissing(): void {
  if (typeof window !== 'undefined' && !window.api) {
    (window as unknown as { api: WindowApi }).api = MOCK_API;
    console.info('[api-mock] Installed mock window.api (browser preview mode)');
  }
}
