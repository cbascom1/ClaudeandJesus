import { useEffect, useState } from 'react';
import { useStudyListStore } from '../../stores/studyListStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import { WORK_LABELS } from '@shared/domain';
import type { Work } from '@shared/domain';

interface StudyListDetailProps {
  listId: number;
  onBack: () => void;
}

export function StudyListDetail({ listId, onBack }: StudyListDetailProps) {
  const lists = useStudyListStore((s) => s.lists);
  const selectedListVerses = useStudyListStore((s) => s.selectedListVerses);
  const loading = useStudyListStore((s) => s.loading);
  const selectList = useStudyListStore((s) => s.selectList);
  const updateList = useStudyListStore((s) => s.updateList);
  const removeVerseFromList = useStudyListStore((s) => s.removeVerseFromList);
  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);
  const selectVerse = useLibraryStore((s) => s.selectVerse);
  const setMainView = useUiStore((s) => s.setMainView);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    void selectList(listId);
  }, [listId, selectList]);

  const list = lists.find((l) => l.id === listId);

  const startEdit = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDesc(list.description ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await updateList(listId, trimmed, editDesc.trim() || null);
    setEditing(false);
  };

  const handleVerseClick = async (bookTitle: string, chapterNumber: number, chapterId: number, verseId: number) => {
    // Find the book by title to get its ID
    const books = await window.api.db.getBooks();
    const book = books.find((b) => b.title === bookTitle);
    if (!book) return;

    // Find the chapter
    const chapters = await window.api.db.getChaptersByBook(book.id);
    const ch = chapters.find((c) => c.number === chapterNumber);
    if (!ch) return;

    await openChapterInTab(book.id, ch.id);
    selectVerse(verseId);
    setMainView('library');
  };

  const handleRemove = async (verseId: number) => {
    await removeVerseFromList(listId, verseId);
  };

  if (!list) {
    return (
      <div className="flex-1 p-6">
        <button onClick={onBack} className="text-xs text-parchment-muted hover:text-parchment-text mb-4">
          &larr; Back
        </button>
        <p className="text-parchment-muted">List not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button
        onClick={onBack}
        className="text-xs text-parchment-muted hover:text-parchment-text mb-4 flex items-center gap-1"
      >
        &larr; All Lists
      </button>

      {editing ? (
        <div className="mb-4 space-y-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="text-xl font-serif font-semibold w-full px-2 py-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
            autoFocus
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description"
            className="text-sm w-full px-2 py-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void saveEdit()}
              className="text-xs px-3 py-1.5 rounded bg-parchment-accent text-white font-medium hover:opacity-90"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-2 py-1.5 text-parchment-muted hover:text-parchment-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-xl font-semibold">{list.name}</h2>
            <button
              onClick={startEdit}
              className="text-xs text-parchment-muted hover:text-parchment-text"
            >
              Edit
            </button>
          </div>
          {list.description && (
            <p className="text-sm text-parchment-muted mt-1">{list.description}</p>
          )}
          <p className="text-xs text-parchment-muted mt-1">
            {selectedListVerses.length} verse{selectedListVerses.length === 1 ? '' : 's'} &middot;
            Created {new Date(list.created).toLocaleDateString()}
          </p>
        </div>
      )}

      {loading && <p className="text-parchment-muted text-sm">Loading…</p>}

      {!loading && selectedListVerses.length === 0 && (
        <p className="text-parchment-muted text-sm italic">
          No verses in this list yet. Select a verse and use "Add to List" in the context panel.
        </p>
      )}

      <ol className="space-y-2 max-w-3xl">
        {selectedListVerses.map((v, idx) => (
          <li
            key={v.verse_id}
            className="group flex gap-3 p-3 border border-parchment-border rounded-lg hover:border-parchment-accent/40 transition-all"
          >
            <span className="text-xs text-parchment-muted shrink-0 w-6 text-right pt-0.5">
              {idx + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => void handleVerseClick(v.book_title, v.chapter_number, v.chapter_id, v.verse_id)}
                className="font-serif text-sm font-semibold hover:text-parchment-accent transition-colors"
              >
                {v.book_title} {v.chapter_number}:{v.verse_number}
              </button>
              <span className="text-xs text-parchment-muted ml-2">
                {WORK_LABELS[v.book_work as Work]}
              </span>
              <p className="scripture-text text-sm leading-snug mt-1 line-clamp-2">{v.text}</p>
            </div>
            <button
              onClick={() => void handleRemove(v.verse_id)}
              className="text-parchment-muted hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs transition-opacity shrink-0 self-start pt-1"
              title="Remove from list"
            >
              &#x2715;
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
