import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../src/types/ipc';
import type { SearchFilters } from '../../src/types/ipc';
import {
  ensureSidecar,
  sidecarHealth,
  sidecarEncode,
  sidecarClassify,
  stopSidecar,
  type SidecarStatus,
  type ClassifyItem
} from '../python/sidecarManager';
import {
  batchSaveEmbeddings,
  semanticSearch,
  getUnembeddedVerseIds,
  countEmbedded,
  countTotalVerses,
  type SemanticSearchResult
} from '../db/queries/embeddings';
import { getAllTopics } from '../db/queries/topics';

export function registerAiHandlers(): void {
  // Sidecar management
  ipcMain.handle(IPC_CHANNELS.aiSidecarStart, async () => {
    await ensureSidecar();
    return sidecarHealth();
  });

  ipcMain.handle(IPC_CHANNELS.aiSidecarStop, () => {
    stopSidecar();
  });

  ipcMain.handle(IPC_CHANNELS.aiSidecarStatus, () => sidecarHealth());

  // Embedding generation — runs in batches, emits progress.
  ipcMain.handle(IPC_CHANNELS.aiGenerateEmbeddings, async (evt) => {
    await ensureSidecar();

    const BATCH_SIZE = 64;
    const total = countTotalVerses();
    const alreadyDone = countEmbedded();
    let processed = alreadyDone;

    const sender = BrowserWindow.fromWebContents(evt.sender);

    while (true) {
      const batch = getUnembeddedVerseIds(BATCH_SIZE);
      if (batch.length === 0) break;

      const texts = batch.map((v) => v.text);
      const embeddings = await sidecarEncode(texts);

      const rows = batch.map((v, i) => ({
        verseId: v.id,
        embedding: embeddings[i]
      }));
      batchSaveEmbeddings(rows);

      processed += batch.length;

      // Emit progress to renderer.
      sender?.webContents.send(IPC_CHANNELS.aiEmbeddingProgress, {
        current: processed,
        total,
        message: `Encoded ${processed} / ${total} verses`
      });
    }

    return { embedded: processed, total };
  });

  // Embedding stats
  ipcMain.handle(IPC_CHANNELS.aiEmbeddingStats, () => ({
    embedded: countEmbedded(),
    total: countTotalVerses()
  }));

  // Semantic search
  ipcMain.handle(
    IPC_CHANNELS.aiSemanticSearch,
    async (_evt, query: string, filters: SearchFilters) => {
      await ensureSidecar();
      const [queryEmbedding] = await sidecarEncode([query]);
      return semanticSearch(queryEmbedding, { works: filters.works });
    }
  );

  // AI topic classification
  ipcMain.handle(
    IPC_CHANNELS.aiClassifyVerse,
    async (_evt, verseText: string) => {
      await ensureSidecar();
      const topics = getAllTopics();
      const labels = topics.map((t) => t.name);
      const results = await sidecarClassify(verseText, labels);
      // Map labels back to topic IDs.
      return results.map((r) => {
        const topic = topics.find((t) => t.name === r.label);
        return { topicId: topic?.id ?? -1, topicName: r.label, score: r.score };
      });
    }
  );
}
