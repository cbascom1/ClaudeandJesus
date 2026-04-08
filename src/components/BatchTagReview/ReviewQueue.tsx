import { useEffect, useState, useCallback, useRef } from 'react';
import { useAiStore } from '../../stores/aiStore';
import { useTagStore } from '../../stores/tagStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { WORK_LABELS } from '@shared/domain';
import type { AiTopicSuggestion } from '@shared/ipc';

interface ReviewVerse {
  id: number;
  text: string;
  book_title: string;
  book_work: string;
  chapter_number: number;
  verse_number: number;
}

interface ReviewItem {
  verse: ReviewVerse;
  suggestions: AiTopicSuggestion[];
  status: 'pending' | 'accepted' | 'dismissed';
}

export function ReviewQueue() {
  const classifyVerse = useAiStore((s) => s.classifyVerse);
  const sidecarStatus = useAiStore((s) => s.sidecarStatus);
  const refreshStatus = useAiStore((s) => s.refreshStatus);
  const addTopicToVerse = useTagStore((s) => s.addTopicToVerse);
  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);
  const selectVerse = useLibraryStore((s) => s.selectVerse);

  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [batchStarted, setBatchStarted] = useState(false);
  const [verseCount, setVerseCount] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const running = sidecarStatus?.running ?? false;

  // Keyboard shortcuts
  useEffect(() => {
    if (!batchStarted || queue.length === 0) return;

    const handler = (e: KeyboardEvent) => {
      const item = queue[currentIdx];
      if (!item || item.status !== 'pending') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        void handleAccept(currentIdx);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDismiss(currentIdx);
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        advanceToNext(currentIdx);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        advanceToPrev(currentIdx);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [batchStarted, queue, currentIdx]);

  const advanceToNext = (from: number) => {
    for (let i = from + 1; i < queue.length; i++) {
      if (queue[i].status === 'pending') {
        setCurrentIdx(i);
        return;
      }
    }
    // Stay at current if no more pending
  };

  const advanceToPrev = (from: number) => {
    for (let i = from - 1; i >= 0; i--) {
      if (queue[i].status === 'pending') {
        setCurrentIdx(i);
        return;
      }
    }
  };

  const handleAccept = async (idx: number) => {
    const item = queue[idx];
    if (!item) return;

    // Add all suggested topics to the verse
    for (const s of item.suggestions) {
      await addTopicToVerse(item.verse.id, s.topicId);
    }

    setQueue((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, status: 'accepted' as const } : q))
    );
    advanceToNext(idx);
  };

  const handleDismiss = (idx: number) => {
    setQueue((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, status: 'dismissed' as const } : q))
    );
    advanceToNext(idx);
  };

  const startBatch = useCallback(async () => {
    setLoading(true);
    setBatchStarted(true);
    setQueue([]);
    setCurrentIdx(0);

    try {
      // Fetch random untagged verses to review
      const allBooks = await window.api.db.getBooks();
      const reviewVerses: ReviewVerse[] = [];

      // Gather verses from imported books
      for (const book of allBooks) {
        if (reviewVerses.length >= verseCount) break;
        const chapters = await window.api.db.getChaptersByBook(book.id);
        for (const ch of chapters) {
          if (reviewVerses.length >= verseCount) break;
          const verses = await window.api.db.getVersesByChapter(ch.id);
          for (const v of verses) {
            if (reviewVerses.length >= verseCount) break;
            // Check if verse already has topics
            const existing = await window.api.topics.getForVerse(v.id);
            if (existing.length === 0) {
              reviewVerses.push({
                id: v.id,
                text: v.text,
                book_title: book.title,
                book_work: book.work,
                chapter_number: ch.number,
                verse_number: v.number
              });
            }
          }
        }
      }

      if (reviewVerses.length === 0) {
        setLoading(false);
        return;
      }

      // Classify each verse
      const items: ReviewItem[] = [];
      for (const verse of reviewVerses) {
        try {
          await classifyVerse(verse.id, verse.text);
          // Read suggestions from store — classifyVerse sets them
          const { suggestions } = useAiStore.getState();
          items.push({
            verse,
            suggestions: [...suggestions],
            status: 'pending'
          });
        } catch (err) {
          console.error('[ReviewQueue] classify failed for verse', verse.id, err);
        }
      }

      setQueue(items);
    } catch (err) {
      console.error('[ReviewQueue] startBatch failed', err);
    } finally {
      setLoading(false);
    }
  }, [classifyVerse, verseCount]);

  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const acceptedCount = queue.filter((q) => q.status === 'accepted').length;
  const dismissedCount = queue.filter((q) => q.status === 'dismissed').length;
  const currentItem = queue[currentIdx];

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-6 max-w-3xl" tabIndex={0}>
      <h2 className="font-serif text-xl mb-2">Batch Tag Review</h2>
      <p className="text-sm text-parchment-muted mb-4">
        AI analyzes untagged verses and suggests topics. Review each suggestion with keyboard
        shortcuts or buttons.
      </p>

      {!running && (
        <div className="p-4 border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            The AI model is not running. Start it from{' '}
            <strong>Topics → AI Settings</strong> before using batch review.
          </p>
        </div>
      )}

      {!batchStarted && (
        <div className="flex items-center gap-3">
          <label className="text-sm">
            Verses to review:
            <input
              type="number"
              value={verseCount}
              onChange={(e) => setVerseCount(Math.max(1, Math.min(100, Number(e.target.value))))}
              className="ml-2 w-16 text-sm px-2 py-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
              min={1}
              max={100}
            />
          </label>
          <button
            onClick={() => void startBatch()}
            disabled={!running || loading}
            className="px-4 py-2 rounded bg-parchment-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Start Batch Review
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm text-parchment-muted">
            <span className="inline-block w-4 h-4 border-2 border-parchment-muted border-t-parchment-accent rounded-full animate-spin" />
            Analyzing verses… This may take a moment.
          </div>
        </div>
      )}

      {batchStarted && !loading && queue.length === 0 && (
        <p className="mt-4 text-sm text-parchment-muted italic">
          No untagged verses found to review.
        </p>
      )}

      {batchStarted && queue.length > 0 && (
        <>
          {/* Progress bar */}
          <div className="mt-4 mb-4">
            <div className="flex items-center justify-between text-xs text-parchment-muted mb-1">
              <span>
                {acceptedCount + dismissedCount} / {queue.length} reviewed
              </span>
              <span>
                <span className="text-green-600">{acceptedCount} accepted</span>
                {' · '}
                <span className="text-red-500">{dismissedCount} dismissed</span>
                {' · '}
                <span>{pendingCount} remaining</span>
              </span>
            </div>
            <div className="h-2 bg-parchment-border rounded overflow-hidden flex">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(acceptedCount / queue.length) * 100}%` }}
              />
              <div
                className="h-full bg-red-400 transition-all"
                style={{ width: `${(dismissedCount / queue.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Keyboard shortcut legend */}
          <div className="flex gap-4 text-xs text-parchment-muted mb-4 p-2 bg-parchment-bg rounded border border-parchment-border">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-parchment-surface border border-parchment-border font-mono">Enter</kbd>{' '}
              Accept
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-parchment-surface border border-parchment-border font-mono">Del</kbd>{' '}
              Dismiss
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-parchment-surface border border-parchment-border font-mono">↑↓</kbd>{' '}
              Navigate
            </span>
          </div>

          {/* Review cards */}
          <ul className="space-y-2">
            {queue.map((item, idx) => (
              <li
                key={item.verse.id}
                className={`p-3 rounded border transition-all ${
                  idx === currentIdx
                    ? 'border-parchment-accent ring-2 ring-parchment-accent/20'
                    : item.status === 'accepted'
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/10 opacity-60'
                      : item.status === 'dismissed'
                        ? 'border-red-200 bg-red-50 dark:bg-red-900/10 opacity-40'
                        : 'border-parchment-border hover:border-parchment-accent/40'
                }`}
                onClick={() => item.status === 'pending' && setCurrentIdx(idx)}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <button
                    className="font-serif text-sm font-semibold hover:text-parchment-accent transition-colors"
                    onClick={async (e) => {
                      e.stopPropagation();
                      // Navigate to this verse in reading view
                      const chapters = await window.api.db.getChaptersByBook(
                        // We need book_id — look it up
                        (await window.api.db.getBooks()).find(
                          (b) => b.title === item.verse.book_title
                        )?.id ?? 0
                      );
                      const ch = chapters.find(
                        (c) => c.number === item.verse.chapter_number
                      );
                      if (ch) {
                        await openChapterInTab(
                          (await window.api.db.getBooks()).find(
                            (b) => b.title === item.verse.book_title
                          )?.id ?? 0,
                          ch.id
                        );
                        selectVerse(item.verse.id);
                      }
                    }}
                  >
                    {item.verse.book_title} {item.verse.chapter_number}:{item.verse.verse_number}
                  </button>
                  <span className="text-xs text-parchment-muted shrink-0">
                    {WORK_LABELS[item.verse.book_work as keyof typeof WORK_LABELS]}
                  </span>
                </div>

                <p className="scripture-text text-sm leading-snug mb-2 line-clamp-2">
                  {item.verse.text}
                </p>

                {/* Suggested topics */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.suggestions.map((s) => (
                    <span
                      key={s.topicId}
                      className="text-xs px-2 py-0.5 rounded-full bg-parchment-accent/10 border border-parchment-accent/30"
                    >
                      {s.topicName}
                      <span className="text-parchment-muted ml-1">
                        {Math.round(s.score * 100)}%
                      </span>
                    </span>
                  ))}
                  {item.suggestions.length === 0 && (
                    <span className="text-xs text-parchment-muted italic">No suggestions</span>
                  )}
                </div>

                {/* Action buttons */}
                {item.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAccept(idx);
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      &#x2713; Accept All
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(idx);
                      }}
                      className="text-xs px-2.5 py-1 rounded border border-parchment-border hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      &#x2715; Dismiss
                    </button>
                  </div>
                )}

                {item.status === 'accepted' && (
                  <span className="text-xs text-green-600 font-medium">&#x2713; Accepted</span>
                )}
                {item.status === 'dismissed' && (
                  <span className="text-xs text-red-500 font-medium">&#x2715; Dismissed</span>
                )}
              </li>
            ))}
          </ul>

          {pendingCount === 0 && (
            <div className="mt-6 p-4 border border-parchment-border rounded-lg text-center">
              <p className="text-sm font-medium mb-2">Review complete!</p>
              <p className="text-xs text-parchment-muted mb-3">
                {acceptedCount} accepted, {dismissedCount} dismissed
              </p>
              <button
                onClick={() => {
                  setBatchStarted(false);
                  setQueue([]);
                  setCurrentIdx(0);
                }}
                className="text-xs px-3 py-1.5 rounded bg-parchment-accent text-white font-medium hover:opacity-90 transition-opacity"
              >
                Start New Batch
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
