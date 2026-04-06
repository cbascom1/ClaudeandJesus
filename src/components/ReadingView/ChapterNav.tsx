import { useEffect } from 'react';
import { useLibraryStore, useActiveTab } from '../../stores/libraryStore';

/**
 * Breadcrumb + prev/next chapter navigation.
 * Prev/next navigates WITHIN the current book. Cross-book jumps come later.
 */
export function ChapterNav() {
  const activeTab = useActiveTab();
  const books = useLibraryStore((s) => s.books);
  const chaptersByBook = useLibraryStore((s) => s.chaptersByBook);
  const loadChaptersForBook = useLibraryStore((s) => s.loadChaptersForBook);
  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);

  // Ensure chapters for the active book are loaded so prev/next work
  useEffect(() => {
    if (activeTab && !chaptersByBook[activeTab.bookId]) {
      loadChaptersForBook(activeTab.bookId);
    }
  }, [activeTab, chaptersByBook, loadChaptersForBook]);

  if (!activeTab) return null;

  const book = books.find((b) => b.id === activeTab.bookId);
  const chapters = chaptersByBook[activeTab.bookId] ?? [];
  const currentIdx = chapters.findIndex((c) => c.id === activeTab.chapterId);
  const prevCh = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextCh = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
  const currentCh = currentIdx >= 0 ? chapters[currentIdx] : null;

  return (
    <header className="px-8 py-3 border-b border-parchment-border flex items-center justify-between gap-4">
      <div className="flex items-baseline gap-2 min-w-0">
        <h2 className="font-serif text-xl truncate">{book?.title ?? 'Book'}</h2>
        <span className="font-serif text-xl text-parchment-muted">
          {currentCh ? `Chapter ${currentCh.number}` : ''}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          disabled={!prevCh}
          onClick={() => prevCh && openChapterInTab(activeTab.bookId, prevCh.id)}
          className="px-3 py-1 text-sm rounded border border-parchment-border hover:bg-parchment-bg disabled:opacity-40 disabled:cursor-not-allowed"
          title={prevCh ? `Chapter ${prevCh.number}` : 'No previous chapter'}
        >
          ← Prev
        </button>
        <button
          disabled={!nextCh}
          onClick={() => nextCh && openChapterInTab(activeTab.bookId, nextCh.id)}
          className="px-3 py-1 text-sm rounded border border-parchment-border hover:bg-parchment-bg disabled:opacity-40 disabled:cursor-not-allowed"
          title={nextCh ? `Chapter ${nextCh.number}` : 'No next chapter'}
        >
          Next →
        </button>
      </div>
    </header>
  );
}
