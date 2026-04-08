/**
 * Shared IPC types — imported by main (to type handlers) and renderer (to type window.api).
 */

import type {
  Book,
  Chapter,
  Verse,
  VerseWithRef,
  Topic,
  Note,
  StudyList,
  Work
} from './domain';

// ---------- Parser / Import types ----------
// (We re-declare a minimal version here rather than importing from electron/parser/types
//  so the renderer doesn't reach into electron/ source paths.)

export interface ImportParsedVerse {
  number: number;
  text: string;
}

export interface ImportParsedChapter {
  number: number;
  verses: ImportParsedVerse[];
}

export interface ImportParsedBook {
  title: string;
  work: 'bible' | 'book_of_mormon' | 'dc' | 'pgp';
  chapters: ImportParsedChapter[];
}

export interface ImportParseWarning {
  line: number;
  type: string;
  message: string;
}

export interface ImportParseResult {
  books: ImportParsedBook[];
  stats: {
    bookCount: number;
    chapterCount: number;
    verseCount: number;
  };
  warnings: ImportParseWarning[];
  errors: Array<{ line: number; message: string }>;
  sourceFile: string;
}

// ---------- IPC API surface exposed to renderer via contextBridge ----------

export type ImportConflictResolution = 'skip' | 'overwrite';

export interface ImportProgressEvent {
  phase: 'reading' | 'parsing' | 'inserting' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface ImportConflict {
  book: { title: string; work: string };
  existingId: number;
}

export interface ImportConfirmRequest {
  parseResult: ImportParseResult;
  /** Per-book resolutions for any detected conflicts. Keyed by `${work}:${title}`. */
  conflictResolutions: Record<string, ImportConflictResolution>;
}

export interface ImportConfirmResponse {
  inserted: Array<{ bookId: number; title: string; work: string; verseCount: number }>;
  skipped: Array<{ title: string; work: string }>;
}

export interface SearchResult {
  verse_id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  /** Verse text with matches wrapped in «…» delimiters. */
  highlighted: string;
  text: string;
  rank: number;
}

export interface SearchFilters {
  works?: Work[];
  bookIds?: number[];
}

export interface DbApi {
  getBooks: () => Promise<Book[]>;
  getChaptersByBook: (bookId: number) => Promise<Chapter[]>;
  getVersesByChapter: (chapterId: number) => Promise<Verse[]>;
  getVerseById: (verseId: number) => Promise<VerseWithRef | null>;
  searchVerses: (
    query: string,
    filters: SearchFilters
  ) => Promise<SearchResult[]>;
}

export interface ImportApi {
  pickFile: () => Promise<string | null>;
  parseFile: (filePath: string) => Promise<ImportParseResult>;
  detectConflicts: (parseResult: ImportParseResult) => Promise<ImportConflict[]>;
  confirmImport: (req: ImportConfirmRequest) => Promise<ImportConfirmResponse>;
  onProgress: (cb: (event: ImportProgressEvent) => void) => () => void;
}

export interface TopicWithMeta extends Topic {
  source: string;
  confirmed: number;
}

export interface TopicStat {
  id: number;
  name: string;
  color: string;
  verse_count: number;
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

export interface TopicsApi {
  getAll: () => Promise<Topic[]>;
  create: (name: string, color: string) => Promise<Topic>;
  update: (id: number, name: string, color: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  merge: (sourceId: number, targetId: number) => Promise<void>;
  getForVerse: (verseId: number) => Promise<TopicWithMeta[]>;
  addToVerse: (verseId: number, topicId: number) => Promise<void>;
  removeFromVerse: (verseId: number, topicId: number) => Promise<void>;
  getStats: () => Promise<TopicStat[]>;
  getVersesForTopic: (topicId: number) => Promise<TopicVerseRow[]>;
  setVerseHighlight: (verseId: number, color: string | null) => Promise<void>;
}

// ---------- AI / Embeddings types ----------

export interface SidecarStatus {
  running: boolean;
  port: number | null;
  model: string | null;
  pid: number | null;
}

export interface EmbeddingProgress {
  current: number;
  total: number;
  message: string;
}

export interface EmbeddingStats {
  embedded: number;
  total: number;
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
  score: number;
}

export interface AiTopicSuggestion {
  topicId: number;
  topicName: string;
  score: number;
}

export interface AiApi {
  sidecarStart: () => Promise<SidecarStatus>;
  sidecarStop: () => Promise<void>;
  sidecarStatus: () => Promise<SidecarStatus>;
  generateEmbeddings: () => Promise<EmbeddingStats>;
  embeddingStats: () => Promise<EmbeddingStats>;
  semanticSearch: (query: string, filters: SearchFilters) => Promise<SemanticSearchResult[]>;
  classifyVerse: (verseText: string) => Promise<AiTopicSuggestion[]>;
  onEmbeddingProgress: (cb: (event: EmbeddingProgress) => void) => () => void;
}

// ---------- Notes types ----------

export interface NotesApi {
  getForVerse: (verseId: number) => Promise<Note[]>;
  create: (verseId: number, content: string) => Promise<Note>;
  update: (noteId: number, content: string) => Promise<void>;
  remove: (noteId: number) => Promise<void>;
}

// ---------- Study Lists types ----------

export interface StudyListVerseRow {
  verse_id: number;
  chapter_id: number;
  book_id: number;
  verse_number: number;
  chapter_number: number;
  book_title: string;
  book_work: Work;
  text: string;
  sort_order: number;
}

export interface StudyListStat {
  id: number;
  name: string;
  description: string | null;
  created: string;
  verse_count: number;
}

export interface StudyListsApi {
  getAll: () => Promise<StudyList[]>;
  create: (name: string, description: string | null) => Promise<StudyList>;
  update: (id: number, name: string, description: string | null) => Promise<void>;
  remove: (id: number) => Promise<void>;
  getVerses: (listId: number) => Promise<StudyListVerseRow[]>;
  addVerse: (listId: number, verseId: number) => Promise<void>;
  removeVerse: (listId: number, verseId: number) => Promise<void>;
  reorderVerse: (listId: number, verseId: number, newOrder: number) => Promise<void>;
  getStats: () => Promise<StudyListStat[]>;
}

export interface AppApi {
  getVersion: () => Promise<string>;
}

export interface WindowApi {
  db: DbApi;
  import: ImportApi;
  topics: TopicsApi;
  notes: NotesApi;
  studyLists: StudyListsApi;
  ai: AiApi;
  app: AppApi;
}

// ---------- IPC channel name constants (for use by main/preload) ----------

export const IPC_CHANNELS = {
  dbGetBooks: 'db:getBooks',
  dbGetChaptersByBook: 'db:getChaptersByBook',
  dbGetVersesByChapter: 'db:getVersesByChapter',
  dbGetVerseById: 'db:getVerseById',
  dbSearchVerses: 'db:searchVerses',
  importPickFile: 'import:pickFile',
  importParseFile: 'import:parseFile',
  importDetectConflicts: 'import:detectConflicts',
  importConfirm: 'import:confirm',
  importProgress: 'import:progress',
  topicsGetAll: 'topics:getAll',
  topicsCreate: 'topics:create',
  topicsUpdate: 'topics:update',
  topicsRemove: 'topics:remove',
  topicsMerge: 'topics:merge',
  topicsGetForVerse: 'topics:getForVerse',
  topicsAddToVerse: 'topics:addToVerse',
  topicsRemoveFromVerse: 'topics:removeFromVerse',
  topicsGetStats: 'topics:getStats',
  topicsGetVersesForTopic: 'topics:getVersesForTopic',
  topicsSetVerseHighlight: 'topics:setVerseHighlight',
  aiSidecarStart: 'ai:sidecarStart',
  aiSidecarStop: 'ai:sidecarStop',
  aiSidecarStatus: 'ai:sidecarStatus',
  aiGenerateEmbeddings: 'ai:generateEmbeddings',
  aiEmbeddingProgress: 'ai:embeddingProgress',
  aiEmbeddingStats: 'ai:embeddingStats',
  aiSemanticSearch: 'ai:semanticSearch',
  aiClassifyVerse: 'ai:classifyVerse',
  notesGetForVerse: 'notes:getForVerse',
  notesCreate: 'notes:create',
  notesUpdate: 'notes:update',
  notesDelete: 'notes:delete',
  studyListsGetAll: 'studyLists:getAll',
  studyListsCreate: 'studyLists:create',
  studyListsUpdate: 'studyLists:update',
  studyListsDelete: 'studyLists:delete',
  studyListsGetVerses: 'studyLists:getVerses',
  studyListsAddVerse: 'studyLists:addVerse',
  studyListsRemoveVerse: 'studyLists:removeVerse',
  studyListsReorderVerse: 'studyLists:reorderVerse',
  studyListsGetStats: 'studyLists:getStats',
  appGetVersion: 'app:getVersion'
} as const;
