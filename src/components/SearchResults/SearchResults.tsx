import { useSearchStore } from '../../stores/searchStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { WORK_LABELS } from '@shared/domain';
import type { Work } from '@shared/domain';
import type { SearchResult, SemanticSearchResult } from '@shared/ipc';

const WORK_OPTIONS: Work[] = ['bible', 'book_of_mormon', 'dc', 'pgp'];

export function SearchResults() {
  const results = useSearchStore((s) => s.results);
  const semanticResults = useSearchStore((s) => s.semanticResults);
  const committedQuery = useSearchStore((s) => s.committedQuery);
  const mode = useSearchStore((s) => s.mode);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const workFilter = useSearchStore((s) => s.workFilter);
  const toggleWorkFilter = useSearchStore((s) => s.toggleWorkFilter);
  const clearFilters = useSearchStore((s) => s.clearFilters);

  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);
  const selectVerse = useLibraryStore((s) => s.selectVerse);
  const clearSearch = useSearchStore((s) => s.clearSearch);

  const navigateToVerse = async (bookId: number, chapterId: number, verseId: number) => {
    await openChapterInTab(bookId, chapterId);
    selectVerse(verseId);
    clearSearch();
  };

  const allResults = mode === 'semantic' ? semanticResults : results;
  const totalCount = allResults.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-parchment-border flex items-center gap-2 flex-wrap">
        <span className="text-xs text-parchment-muted uppercase tracking-wide mr-2">
          Canon:
        </span>
        {WORK_OPTIONS.map((w) => {
          const active = workFilter.includes(w);
          return (
            <button
              key={w}
              onClick={() => toggleWorkFilter(w)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                active
                  ? 'bg-parchment-accent text-white border-parchment-accent'
                  : 'border-parchment-border hover:bg-parchment-bg'
              }`}
            >
              {WORK_LABELS[w]}
            </button>
          );
        })}
        {workFilter.length > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs px-2 py-1 text-parchment-muted hover:text-parchment-text ml-1"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <p className="text-parchment-muted">Searching…</p>}

        {error && !loading && (
          <p className="text-red-700 dark:text-red-400 text-sm">Error: {error}</p>
        )}

        {!loading && !error && totalCount === 0 && committedQuery && (
          <p className="text-parchment-muted italic">
            No verses matched "{committedQuery}".
            {mode === 'semantic' && (
              <span className="block mt-1 text-xs">
                Make sure embeddings have been generated (Topics → AI Settings).
              </span>
            )}
          </p>
        )}

        {!loading && totalCount > 0 && (
          <>
            <p className="text-xs text-parchment-muted mb-3">
              {totalCount} result{totalCount === 1 ? '' : 's'}
              {mode === 'semantic' && ' (by relevance)'}
            </p>
            <ul className="space-y-2 max-w-3xl">
              {mode === 'exact'
                ? (results as SearchResult[]).map((r) => (
                    <ExactResultCard
                      key={r.verse_id}
                      result={r}
                      onClick={() => navigateToVerse(r.book_id, r.chapter_id, r.verse_id)}
                    />
                  ))
                : (semanticResults as SemanticSearchResult[]).map((r) => (
                    <SemanticResultCard
                      key={r.verse_id}
                      result={r}
                      onClick={() => navigateToVerse(r.book_id, r.chapter_id, r.verse_id)}
                    />
                  ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Exact result card ----------

function ExactResultCard({
  result,
  onClick
}: {
  result: SearchResult;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left p-3 rounded border border-parchment-border hover:bg-parchment-surface hover:border-parchment-accent/40 transition-colors"
      >
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <span className="font-serif text-sm font-semibold">
            {result.book_title} {result.chapter_number}:{result.verse_number}
          </span>
          <span className="text-xs text-parchment-muted shrink-0">
            {WORK_LABELS[result.book_work]}
          </span>
        </div>
        <p className="scripture-text text-sm leading-snug">
          <HighlightedText highlighted={result.highlighted} />
        </p>
      </button>
    </li>
  );
}

// ---------- Semantic result card ----------

function SemanticResultCard({
  result,
  onClick
}: {
  result: SemanticSearchResult;
  onClick: () => void;
}) {
  const pct = Math.round(result.score * 100);
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left p-3 rounded border border-parchment-border hover:bg-parchment-surface hover:border-parchment-accent/40 transition-colors"
      >
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <span className="font-serif text-sm font-semibold">
            {result.book_title} {result.chapter_number}:{result.verse_number}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-parchment-accent">{pct}%</span>
            <span className="text-xs text-parchment-muted">
              {WORK_LABELS[result.book_work]}
            </span>
          </span>
        </div>
        <p className="scripture-text text-sm leading-snug">{result.text}</p>
      </button>
    </li>
  );
}

// ---------- FTS5 highlight parser ----------

function HighlightedText({ highlighted }: { highlighted: string }) {
  const parts: Array<{ text: string; match: boolean }> = [];
  let i = 0;
  while (i < highlighted.length) {
    const openIdx = highlighted.indexOf('«', i);
    if (openIdx === -1) {
      parts.push({ text: highlighted.slice(i), match: false });
      break;
    }
    if (openIdx > i) {
      parts.push({ text: highlighted.slice(i, openIdx), match: false });
    }
    const closeIdx = highlighted.indexOf('»', openIdx + 1);
    if (closeIdx === -1) {
      parts.push({ text: highlighted.slice(openIdx), match: false });
      break;
    }
    parts.push({ text: highlighted.slice(openIdx + 1, closeIdx), match: true });
    i = closeIdx + 1;
  }
  return (
    <>
      {parts.map((p, idx) =>
        p.match ? (
          <mark key={idx} className="search-highlight">
            {p.text}
          </mark>
        ) : (
          <span key={idx}>{p.text}</span>
        )
      )}
    </>
  );
}
