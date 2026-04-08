import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../src/types/ipc';
import type { ImportProgressEvent, EmbeddingProgress, WindowApi } from '../src/types/ipc';

const api: WindowApi = {
  db: {
    getBooks: () => ipcRenderer.invoke(IPC_CHANNELS.dbGetBooks),
    getChaptersByBook: (bookId) =>
      ipcRenderer.invoke(IPC_CHANNELS.dbGetChaptersByBook, bookId),
    getVersesByChapter: (chapterId) =>
      ipcRenderer.invoke(IPC_CHANNELS.dbGetVersesByChapter, chapterId),
    getVerseById: (verseId) =>
      ipcRenderer.invoke(IPC_CHANNELS.dbGetVerseById, verseId),
    searchVerses: (query, filters) =>
      ipcRenderer.invoke(IPC_CHANNELS.dbSearchVerses, query, filters)
  },
  import: {
    pickFile: () => ipcRenderer.invoke(IPC_CHANNELS.importPickFile),
    parseFile: (filePath) =>
      ipcRenderer.invoke(IPC_CHANNELS.importParseFile, filePath),
    detectConflicts: (parseResult) =>
      ipcRenderer.invoke(IPC_CHANNELS.importDetectConflicts, parseResult),
    confirmImport: (req) => ipcRenderer.invoke(IPC_CHANNELS.importConfirm, req),
    onProgress: (cb) => {
      const handler = (_evt: unknown, event: ImportProgressEvent) => cb(event);
      ipcRenderer.on(IPC_CHANNELS.importProgress, handler);
      // Return an unsubscribe function
      return () => ipcRenderer.removeListener(IPC_CHANNELS.importProgress, handler);
    }
  },
  topics: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.topicsGetAll),
    create: (name, color) => ipcRenderer.invoke(IPC_CHANNELS.topicsCreate, name, color),
    update: (id, name, color) => ipcRenderer.invoke(IPC_CHANNELS.topicsUpdate, id, name, color),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.topicsRemove, id),
    merge: (sourceId, targetId) => ipcRenderer.invoke(IPC_CHANNELS.topicsMerge, sourceId, targetId),
    getForVerse: (verseId) => ipcRenderer.invoke(IPC_CHANNELS.topicsGetForVerse, verseId),
    addToVerse: (verseId, topicId) => ipcRenderer.invoke(IPC_CHANNELS.topicsAddToVerse, verseId, topicId),
    removeFromVerse: (verseId, topicId) => ipcRenderer.invoke(IPC_CHANNELS.topicsRemoveFromVerse, verseId, topicId),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.topicsGetStats),
    getVersesForTopic: (topicId) => ipcRenderer.invoke(IPC_CHANNELS.topicsGetVersesForTopic, topicId),
    setVerseHighlight: (verseId, color) => ipcRenderer.invoke(IPC_CHANNELS.topicsSetVerseHighlight, verseId, color)
  },
  notes: {
    getForVerse: (verseId) => ipcRenderer.invoke(IPC_CHANNELS.notesGetForVerse, verseId),
    create: (verseId, content) => ipcRenderer.invoke(IPC_CHANNELS.notesCreate, verseId, content),
    update: (noteId, content) => ipcRenderer.invoke(IPC_CHANNELS.notesUpdate, noteId, content),
    remove: (noteId) => ipcRenderer.invoke(IPC_CHANNELS.notesDelete, noteId)
  },
  studyLists: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.studyListsGetAll),
    create: (name, description) => ipcRenderer.invoke(IPC_CHANNELS.studyListsCreate, name, description),
    update: (id, name, description) => ipcRenderer.invoke(IPC_CHANNELS.studyListsUpdate, id, name, description),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.studyListsDelete, id),
    getVerses: (listId) => ipcRenderer.invoke(IPC_CHANNELS.studyListsGetVerses, listId),
    addVerse: (listId, verseId) => ipcRenderer.invoke(IPC_CHANNELS.studyListsAddVerse, listId, verseId),
    removeVerse: (listId, verseId) => ipcRenderer.invoke(IPC_CHANNELS.studyListsRemoveVerse, listId, verseId),
    reorderVerse: (listId, verseId, newOrder) => ipcRenderer.invoke(IPC_CHANNELS.studyListsReorderVerse, listId, verseId, newOrder),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.studyListsGetStats)
  },
  ai: {
    sidecarStart: () => ipcRenderer.invoke(IPC_CHANNELS.aiSidecarStart),
    sidecarStop: () => ipcRenderer.invoke(IPC_CHANNELS.aiSidecarStop),
    sidecarStatus: () => ipcRenderer.invoke(IPC_CHANNELS.aiSidecarStatus),
    generateEmbeddings: () => ipcRenderer.invoke(IPC_CHANNELS.aiGenerateEmbeddings),
    embeddingStats: () => ipcRenderer.invoke(IPC_CHANNELS.aiEmbeddingStats),
    semanticSearch: (query, filters) =>
      ipcRenderer.invoke(IPC_CHANNELS.aiSemanticSearch, query, filters),
    classifyVerse: (verseText) =>
      ipcRenderer.invoke(IPC_CHANNELS.aiClassifyVerse, verseText),
    onEmbeddingProgress: (cb) => {
      const handler = (_evt: unknown, event: EmbeddingProgress) => cb(event);
      ipcRenderer.on(IPC_CHANNELS.aiEmbeddingProgress, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.aiEmbeddingProgress, handler);
    }
  },
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.appGetVersion)
  }
};

contextBridge.exposeInMainWorld('api', api);
