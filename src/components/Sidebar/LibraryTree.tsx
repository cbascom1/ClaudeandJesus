import { useState } from 'react';
import { useLibraryStore, useActiveTab } from '../../stores/libraryStore';
import { WORK_LABELS } from '@shared/domain';
import type { Work, Book } from '@shared/domain';

const WORK_ORDER: Work[] = ['bible', 'book_of_mormon', 'dc', 'pgp'];

export function LibraryTree() {
  const books = useLibraryStore((s) => s.books);
  const loadingBooks = useLibraryStore((s) => s.loadingBooks);

  const grouped: Record<Work, Book[]> = {
    bible: [],
    book_of_mormon: [],
    dc: [],
    pgp: []
  };
  for (const book of books) grouped[book.work].push(book);

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {loadingBooks && <p className="px-4 py-2 text-parchment-muted text-sm">Loading…</p>}
      {!loadingBooks && books.length === 0 && (
        <p className="px-4 py-3 text-parchment-muted text-sm italic">
          No scriptures imported yet. Click "Import Scripture" below.
        </p>
      )}
      {WORK_ORDER.map((work) =>
        grouped[work].length > 0 ? (
          <WorkGroup key={work} work={work} books={grouped[work]} />
        ) : null
      )}
    </nav>
  );
}

function WorkGroup({ work, books }: { work: Work; books: Book[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-parchment-muted hover:bg-parchment-bg"
      >
        {expanded ? '▾' : '▸'} {WORK_LABELS[work]}
      </button>
      {expanded && (
        <ul>
          {books.map((book) => (
            <BookItem key={book.id} book={book} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BookItem({ book }: { book: Book }) {
  const [expanded, setExpanded] = useState(false);
  const chapters = useLibraryStore((s) => s.chaptersByBook[book.id]);
  const loadChaptersForBook = useLibraryStore((s) => s.loadChaptersForBook);
  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);
  const activeTab = useActiveTab();

  const isBookActive = activeTab?.bookId === book.id;

  const handleToggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !chapters) {
      await loadChaptersForBook(book.id);
    }
  };

  return (
    <li>
      <button
        onClick={handleToggle}
        className={`w-full px-4 py-1 text-left text-sm hover:bg-parchment-bg ${
          isBookActive ? 'font-semibold' : ''
        }`}
      >
        {expanded ? '▾' : '▸'} {book.title}
      </button>
      {expanded && chapters && (
        <ul className="pl-6">
          {chapters.map((ch) => (
            <li key={ch.id}>
              <button
                onClick={() => openChapterInTab(book.id, ch.id)}
                className={`w-full text-left text-xs py-0.5 px-2 rounded hover:bg-parchment-bg ${
                  activeTab?.chapterId === ch.id
                    ? 'bg-parchment-bg font-semibold text-parchment-accent'
                    : ''
                }`}
              >
                Chapter {ch.number}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
