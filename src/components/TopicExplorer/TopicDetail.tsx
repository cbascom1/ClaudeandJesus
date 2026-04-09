import { useEffect, useState } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { WORK_LABELS } from '@shared/domain';
import type { Work } from '@shared/domain';
import type { TopicVerseRow } from '@shared/ipc';

export function TopicDetail({ topicId, onBack }: { topicId: number; onBack: () => void }) {
  const topics = useTagStore((s) => s.topics);
  const topicVerses = useTagStore((s) => s.topicVerses);
  const explorerLoading = useTagStore((s) => s.explorerLoading);
  const selectTopic = useTagStore((s) => s.selectTopic);
  const updateTopic = useTagStore((s) => s.updateTopic);

  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);
  const selectVerse = useLibraryStore((s) => s.selectVerse);

  const topic = topics.find((t) => t.id === topicId);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    selectTopic(topicId);
  }, [topicId, selectTopic]);

  const handleEdit = () => {
    if (!topic) return;
    setEditName(topic.name);
    setEditColor(topic.color);
    setEditing(true);
  };

  const handleSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await updateTopic(topicId, trimmed, editColor);
    setEditing(false);
  };

  const handleVerseClick = async (row: TopicVerseRow) => {
    await openChapterInTab(row.book_id, row.chapter_id);
    selectVerse(row.verse_id);
  };

  if (!topic) {
    return (
      <div className="flex-1 p-6">
        <button onClick={onBack} className="text-sm text-parchment-accent hover:underline mb-4">
          ← Back to topics
        </button>
        <p className="text-parchment-muted">Topic not found.</p>
      </div>
    );
  }

  // Group verses by book for display.
  const grouped = new Map<string, { work: Work; bookTitle: string; verses: TopicVerseRow[] }>();
  for (const row of topicVerses) {
    const key = `${row.book_work}:${row.book_title}`;
    if (!grouped.has(key)) {
      grouped.set(key, { work: row.book_work, bookTitle: row.book_title, verses: [] });
    }
    grouped.get(key)!.verses.push(row);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button onClick={onBack} className="text-sm text-parchment-accent hover:underline mb-4">
        ← Back to topics
      </button>

      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-4 h-4 rounded-full shrink-0"
          style={{ backgroundColor: topic.color }}
        />
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              className="w-6 h-6 cursor-pointer border-0"
            />
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-lg font-serif px-2 py-0.5 border border-parchment-border rounded bg-parchment-bg focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 rounded bg-parchment-accent text-white hover:opacity-90"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-2 py-1 text-parchment-muted hover:text-parchment-text"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl">{topic.name}</h2>
            <button
              onClick={handleEdit}
              className="text-xs px-2 py-1 rounded border border-parchment-border hover:bg-parchment-bg text-parchment-muted"
            >
              Edit
            </button>
            <button
              onClick={() => void window.api.export.toFile({ type: 'topic', id: topicId })}
              className="text-xs px-2 py-1 rounded border border-parchment-border hover:bg-parchment-bg text-parchment-muted"
            >
              Export
            </button>
          </>
        )}
      </div>

      <p className="text-sm text-parchment-muted mb-4">
        {topicVerses.length} tagged verse{topicVerses.length === 1 ? '' : 's'}
      </p>

      {explorerLoading && <p className="text-parchment-muted text-sm">Loading…</p>}

      {!explorerLoading && topicVerses.length === 0 && (
        <p className="text-parchment-muted text-sm italic">
          No verses tagged with this topic yet. Select a verse and add this topic from the Context panel.
        </p>
      )}

      {!explorerLoading && (
        <div className="space-y-6 max-w-3xl">
          {[...grouped.entries()].map(([key, group]) => (
            <div key={key}>
              <h3 className="font-serif text-sm font-semibold mb-1">
                {group.bookTitle}{' '}
                <span className="text-xs text-parchment-muted font-normal">
                  {WORK_LABELS[group.work]}
                </span>
              </h3>
              <ul className="space-y-1.5">
                {group.verses.map((row) => (
                  <li key={row.verse_id}>
                    <button
                      onClick={() => handleVerseClick(row)}
                      className="w-full text-left p-2.5 rounded border border-parchment-border hover:bg-parchment-surface hover:border-parchment-accent/40 transition-colors"
                    >
                      <span className="font-serif text-xs font-semibold mr-2">
                        {row.chapter_number}:{row.verse_number}
                      </span>
                      <span className="scripture-text text-sm">{row.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
