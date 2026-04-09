import { ipcMain, dialog, BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import { IPC_CHANNELS } from '../../src/types/ipc';
import type { ExportRequest } from '../../src/types/ipc';
import { getNotesForVerse } from '../db/queries/notes';
import { getStudyListVerses } from '../db/queries/studyLists';
import { getVersesForTopic } from '../db/queries/topics';
import { getAllStudyLists } from '../db/queries/studyLists';
import { getAllTopics } from '../db/queries/topics';
import { getCrossRefsForVerse } from '../db/queries/crossRefs';
import { getDb } from '../db/database';
import type { Work } from '../../src/types/domain';

function getVerseRef(verseId: number): { ref: string; text: string } | null {
  const row = getDb()
    .prepare(
      `SELECT b.title, c.number AS ch, v.number AS vn, v.text
         FROM verses v JOIN chapters c ON c.id = v.chapter_id JOIN books b ON b.id = c.book_id
        WHERE v.id = ?`
    )
    .get(verseId) as { title: string; ch: number; vn: number; text: string } | undefined;
  if (!row) return null;
  return { ref: `${row.title} ${row.ch}:${row.vn}`, text: row.text };
}

function buildMarkdown(req: ExportRequest): string {
  const lines: string[] = [];

  if (req.type === 'studyList') {
    const lists = getAllStudyLists();
    const list = lists.find((l) => l.id === req.id);
    lines.push(`# ${list?.name ?? 'Study List'}`);
    if (list?.description) lines.push(`\n${list.description}`);
    lines.push('');
    const verses = getStudyListVerses(req.id!);
    verses.forEach((v, i) => {
      lines.push(`${i + 1}. **${v.book_title} ${v.chapter_number}:${v.verse_number}**`);
      lines.push(`   ${v.text}`);

      // Include notes for this verse
      const notes = getNotesForVerse(v.verse_id);
      for (const n of notes) {
        lines.push(`   > *Note:* ${n.content}`);
      }
      lines.push('');
    });
  } else if (req.type === 'topic') {
    const topics = getAllTopics();
    const topic = topics.find((t) => t.id === req.id);
    lines.push(`# Topic: ${topic?.name ?? 'Unknown'}`);
    lines.push('');
    const verses = getVersesForTopic(req.id!);
    let currentBook = '';
    for (const v of verses) {
      if (v.book_title !== currentBook) {
        currentBook = v.book_title;
        lines.push(`## ${currentBook}`);
        lines.push('');
      }
      lines.push(`- **${v.chapter_number}:${v.verse_number}** — ${v.text}`);
    }
    lines.push('');
  } else if (req.type === 'notes') {
    lines.push('# My Notes');
    lines.push('');
    // Export all notes across all verses
    const allNotes = getDb()
      .prepare(
        `SELECT n.id, n.content, n.created, n.updated,
                b.title AS book_title, c.number AS chapter_number, v.number AS verse_number, v.text
           FROM notes n
           JOIN verses   v ON v.id = n.verse_id
           JOIN chapters c ON c.id = v.chapter_id
           JOIN books    b ON b.id = c.book_id
          ORDER BY b.work, b.title, c.number, v.number, n.created`
      )
      .all() as Array<{
        id: number; content: string; created: string; updated: string;
        book_title: string; chapter_number: number; verse_number: number; text: string;
      }>;

    let currentRef = '';
    for (const n of allNotes) {
      const ref = `${n.book_title} ${n.chapter_number}:${n.verse_number}`;
      if (ref !== currentRef) {
        currentRef = ref;
        lines.push(`## ${ref}`);
        lines.push(`> ${n.text}`);
        lines.push('');
      }
      lines.push(`- ${n.content} *(${new Date(n.created).toLocaleDateString()})*`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function registerExportHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.exportToFile, async (_evt, req: ExportRequest) => {
    const defaultName =
      req.type === 'studyList'
        ? 'study-list.md'
        : req.type === 'topic'
          ? 'topic-verses.md'
          : 'notes.md';

    const result = await dialog.showSaveDialog({
      title: 'Export',
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] }
      ]
    });

    if (result.canceled || !result.filePath) return null;

    const markdown = buildMarkdown(req);
    writeFileSync(result.filePath, markdown, 'utf-8');
    return result.filePath;
  });
}
