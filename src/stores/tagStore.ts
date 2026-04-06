import { create } from 'zustand';
import type { Topic } from '@shared/domain';
import type { TopicWithMeta, TopicStat, TopicVerseRow } from '@shared/ipc';

interface TagState {
  /** All available topics (cached). */
  topics: Topic[];
  topicsLoaded: boolean;

  /** Topics tagged on the currently-selected verse. */
  verseTopics: TopicWithMeta[];
  verseTopicsFor: number | null; // which verseId is loaded

  /** Topic Explorer state. */
  topicStats: TopicStat[];
  selectedTopicId: number | null;
  topicVerses: TopicVerseRow[];
  explorerLoading: boolean;

  // Actions — topic catalog
  loadTopics: () => Promise<void>;
  createTopic: (name: string, color: string) => Promise<Topic>;
  updateTopic: (id: number, name: string, color: string) => Promise<void>;
  deleteTopic: (id: number) => Promise<void>;
  mergeTopics: (sourceId: number, targetId: number) => Promise<void>;

  // Actions — verse tagging
  loadVerseTopics: (verseId: number) => Promise<void>;
  addTopicToVerse: (verseId: number, topicId: number) => Promise<void>;
  removeTopicFromVerse: (verseId: number, topicId: number) => Promise<void>;

  // Actions — explorer
  loadTopicStats: () => Promise<void>;
  selectTopic: (topicId: number | null) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  topics: [],
  topicsLoaded: false,
  verseTopics: [],
  verseTopicsFor: null,
  topicStats: [],
  selectedTopicId: null,
  topicVerses: [],
  explorerLoading: false,

  loadTopics: async () => {
    if (get().topicsLoaded) return;
    try {
      const topics = await window.api.topics.getAll();
      set({ topics, topicsLoaded: true });
    } catch (err) {
      console.error('[tagStore] loadTopics failed', err);
    }
  },

  createTopic: async (name, color) => {
    const topic = await window.api.topics.create(name, color);
    set((s) => ({ topics: [...s.topics, topic].sort((a, b) => a.name.localeCompare(b.name)) }));
    return topic;
  },

  updateTopic: async (id, name, color) => {
    await window.api.topics.update(id, name, color);
    set((s) => ({
      topics: s.topics.map((t) => (t.id === id ? { ...t, name, color } : t))
    }));
  },

  deleteTopic: async (id) => {
    await window.api.topics.remove(id);
    set((s) => ({
      topics: s.topics.filter((t) => t.id !== id),
      verseTopics: s.verseTopics.filter((t) => t.id !== id)
    }));
  },

  mergeTopics: async (sourceId, targetId) => {
    await window.api.topics.merge(sourceId, targetId);
    // Refresh everything since verse associations changed.
    set({ topicsLoaded: false });
    await get().loadTopics();
    if (get().verseTopicsFor != null) {
      await get().loadVerseTopics(get().verseTopicsFor!);
    }
  },

  loadVerseTopics: async (verseId) => {
    try {
      const verseTopics = await window.api.topics.getForVerse(verseId);
      set({ verseTopics, verseTopicsFor: verseId });
    } catch (err) {
      console.error('[tagStore] loadVerseTopics failed', err);
    }
  },

  addTopicToVerse: async (verseId, topicId) => {
    await window.api.topics.addToVerse(verseId, topicId);
    await get().loadVerseTopics(verseId);
  },

  removeTopicFromVerse: async (verseId, topicId) => {
    await window.api.topics.removeFromVerse(verseId, topicId);
    await get().loadVerseTopics(verseId);
  },

  loadTopicStats: async () => {
    set({ explorerLoading: true });
    try {
      const topicStats = await window.api.topics.getStats();
      set({ topicStats, explorerLoading: false });
    } catch (err) {
      console.error('[tagStore] loadTopicStats failed', err);
      set({ explorerLoading: false });
    }
  },

  selectTopic: async (topicId) => {
    if (topicId == null) {
      set({ selectedTopicId: null, topicVerses: [] });
      return;
    }
    set({ selectedTopicId: topicId, explorerLoading: true });
    try {
      const topicVerses = await window.api.topics.getVersesForTopic(topicId);
      set({ topicVerses, explorerLoading: false });
    } catch (err) {
      console.error('[tagStore] selectTopic failed', err);
      set({ explorerLoading: false });
    }
  }
}));
