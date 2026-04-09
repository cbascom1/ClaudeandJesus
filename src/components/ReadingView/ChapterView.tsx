import { useEffect, useRef } from 'react';
import { useLibraryStore, useActiveTab } from '../../stores/libraryStore';
import { ChapterNav } from './ChapterNav';
import type { Verse } from '@shared/domain';

// Stable empty reference — new `[]` on every render causes infinite loops with Zustand selectors.
const EMPTY_VERSES: Verse[] = [];

export function ChapterView() {
  const activeTab = useActiveTab();
  const verses = useLibraryStore((s) =>
    activeTab ? (s.versesByChapter[activeTab.chapterId] ?? EMPTY_VERSES) : EMPTY_VERSES
  );
  const loadingVersesFor = useLibraryStore((s) => s.loadingVersesFor);
  const selectedVerseId = useLibraryStore((s) => s.selectedVerseId);
  const selectVerse = useLibraryStore((s) => s.selectVerse);
  const selectedRef = useRef<HTMLParagraphElement>(null);

  // Scroll selected verse into view
  useEffect(() => {
    if (selectedVerseId != null && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedVerseId]);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-parchment-muted">
        <div className="max-w-md text-center px-6">
          <h2 className="font-serif text-2xl mb-3">Welcome</h2>
          <p className="text-sm">
            Select a chapter from the library on the left, or import a scripture text file
            to begin building your study library.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = loadingVersesFor === activeTab.chapterId;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChapterNav />
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading && <p className="text-parchment-muted">Loading verses…</p>}
        {!isLoading && verses.length === 0 && (
          <p className="text-parchment-muted italic">This chapter has no verses.</p>
        )}
        <div className="scripture-text max-w-3xl">
          {verses.map((v) => (
            <p
              key={v.id}
              ref={v.id === selectedVerseId ? selectedRef : undefined}
              onClick={() => selectVerse(v.id === selectedVerseId ? null : v.id)}
              className={`cursor-pointer py-1 px-2 -mx-2 rounded transition-colors ${
                selectedVerseId === v.id
                  ? 'bg-parchment-accent/15'
                  : 'hover:bg-parchment-surface'
              }`}
            >
              <span className="inline-block font-sans text-xs align-top text-parchment-muted pr-2 pt-1 select-none min-w-[1.75rem]">
                {v.number}
              </span>
              <span>{v.text}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
