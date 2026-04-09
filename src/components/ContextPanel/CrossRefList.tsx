import { useEffect, useState, useRef } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import type { CrossRefRow, SearchResult } from '@shared/ipc';

export function CrossRefList({ verseId }: { verseId: number }) {
  const [refs, setRefs] = useState<CrossRefRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);
  const selectVerse = useLibraryStore((s) => s.selectVerse);
  const setMainView = useUiStore((s) => s.setMainView);
  const addRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadRefs = async () => {
    setLoading(true);
    try {
      const data = await window.api.crossRefs.getForVerse(verseId);
      setRefs(data);
    } catch (err) {
      console.error('[CrossRefList] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRefs();
  }, [verseId]);

  // Close add panel on outside click
  useEffect(() => {
    if (!showAdd) return;
    const handler = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setShowAdd(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAdd]);

  useEffect(() => {
    if (showAdd) searchInputRef.current?.focus();
  }, [showAdd]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const results = await window.api.db.searchVerses(q, {});
      // Filter out the current verse
      setSearchResults(results.filter((r) => r.verse_id !== verseId).slice(0, 10));
    } catch (err) {
      console.error('[CrossRefList] search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (targetVerseId: number) => {
    await window.api.crossRefs.add(verseId, targetVerseId, noteInput.trim() || null);
    setNoteInput('');
    setShowAdd(false);
    setSearchQuery('');
    setSearchResults([]);
    await loadRefs();
  };

  const handleRemove = async (id: number) => {
    await window.api.crossRefs.remove(id);
    setRefs((prev) => prev.filter((r) => r.id !== id));
  };

  const handleNavigate = async (ref: CrossRefRow) => {
    const books = await window.api.db.getBooks();
    const book = books.find((b) => b.title === ref.book_title);
    if (!book) return;
    const chapters = await window.api.db.getChaptersByBook(book.id);
    const ch = chapters.find((c) => c.number === ref.chapter_number);
    if (!ch) return;
    await openChapterInTab(book.id, ch.id);
    selectVerse(ref.linked_verse_id);
    setMainView('library');
  };

  if (loading) {
    return <p className="text-xs text-parchment-muted">Loading…</p>;
  }

  return (
    <div>
      {refs.length === 0 && (
        <p className="text-xs text-parchment-muted italic mb-2">No cross-references.</p>
      )}

      {refs.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {refs.map((ref) => (
            <li
              key={ref.id}
              className="group flex items-start gap-2 text-xs p-1.5 rounded border border-parchment-border bg-parchment-bg"
            >
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => void handleNavigate(ref)}
                  className="font-serif font-semibold text-xs hover:text-parchment-accent transition-colors"
                >
                  {ref.book_title} {ref.chapter_number}:{ref.verse_number}
                </button>
                <span className="text-[10px] text-parchment-muted ml-1">
                  {ref.direction === 'outgoing' ? '→' : '←'}
                </span>
                <p className="text-[11px] leading-snug mt-0.5 line-clamp-2 text-parchment-muted">
                  {ref.text}
                </p>
                {ref.note && (
                  <p className="text-[10px] italic text-parchment-muted mt-0.5">
                    {ref.note}
                  </p>
                )}
              </div>
              <button
                onClick={() => void handleRemove(ref.id)}
                className="text-parchment-muted hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs transition-opacity shrink-0"
                title="Remove"
              >
                &#x2715;
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add cross-reference */}
      <div ref={addRef} className="relative">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs px-2 py-1 rounded border border-parchment-border hover:bg-parchment-bg transition-colors"
        >
          + Add Cross-Reference
        </button>

        {showAdd && (
          <div className="absolute z-40 mt-1 left-0 w-64 bg-parchment-surface border border-parchment-border rounded shadow-lg overflow-hidden flex flex-col">
            <div className="p-2 border-b border-parchment-border">
              <div className="flex gap-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSearch();
                  }}
                  placeholder="Search for a verse…"
                  className="flex-1 text-xs px-2 py-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
                />
                <button
                  onClick={() => void handleSearch()}
                  className="text-xs px-2 py-1 rounded bg-parchment-accent text-white hover:opacity-90"
                >
                  Go
                </button>
              </div>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Note (optional)"
                className="w-full text-xs px-2 py-1 mt-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
              />
            </div>

            <ul className="max-h-48 overflow-y-auto">
              {searching && (
                <li className="px-3 py-2 text-xs text-parchment-muted">Searching…</li>
              )}
              {!searching && searchResults.length === 0 && searchQuery && (
                <li className="px-3 py-2 text-xs text-parchment-muted italic">
                  No results. Try a keyword search.
                </li>
              )}
              {searchResults.map((r) => (
                <li key={r.verse_id}>
                  <button
                    onClick={() => void handleAdd(r.verse_id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-parchment-bg transition-colors border-b border-parchment-border last:border-b-0"
                  >
                    <span className="font-semibold">
                      {r.book_title} {r.chapter_number}:{r.verse_number}
                    </span>
                    <p className="text-[10px] text-parchment-muted line-clamp-1 mt-0.5">
                      {r.text}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
