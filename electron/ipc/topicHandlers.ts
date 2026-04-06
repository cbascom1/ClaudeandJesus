import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/types/ipc';
import {
  getAllTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  mergeTopics,
  getTopicsForVerse,
  addTopicToVerse,
  removeTopicFromVerse,
  getTopicStats,
  getVersesForTopic,
  setVerseHighlightColor
} from '../db/queries/topics';

export function registerTopicHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.topicsGetAll, () => getAllTopics());

  ipcMain.handle(IPC_CHANNELS.topicsCreate, (_evt, name: string, color: string) =>
    createTopic(name, color)
  );

  ipcMain.handle(IPC_CHANNELS.topicsUpdate, (_evt, id: number, name: string, color: string) =>
    updateTopic(id, name, color)
  );

  ipcMain.handle(IPC_CHANNELS.topicsRemove, (_evt, id: number) => deleteTopic(id));

  ipcMain.handle(IPC_CHANNELS.topicsMerge, (_evt, sourceId: number, targetId: number) =>
    mergeTopics(sourceId, targetId)
  );

  ipcMain.handle(IPC_CHANNELS.topicsGetForVerse, (_evt, verseId: number) =>
    getTopicsForVerse(verseId)
  );

  ipcMain.handle(IPC_CHANNELS.topicsAddToVerse, (_evt, verseId: number, topicId: number) =>
    addTopicToVerse(verseId, topicId)
  );

  ipcMain.handle(IPC_CHANNELS.topicsRemoveFromVerse, (_evt, verseId: number, topicId: number) =>
    removeTopicFromVerse(verseId, topicId)
  );

  ipcMain.handle(IPC_CHANNELS.topicsGetStats, () => getTopicStats());

  ipcMain.handle(IPC_CHANNELS.topicsGetVersesForTopic, (_evt, topicId: number) =>
    getVersesForTopic(topicId)
  );

  ipcMain.handle(IPC_CHANNELS.topicsSetVerseHighlight, (_evt, verseId: number, color: string | null) =>
    setVerseHighlightColor(verseId, color)
  );
}
