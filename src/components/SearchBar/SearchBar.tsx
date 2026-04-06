import { useEffect, useRef } from 'react';
import { useSearchStore } from '../../stores/searchStore';

export function SearchBar() {
  const query = useSearchStore((s) => s.query);
  const loading = useSearchStore((s) => s.loading);
  const committedQuery = useSearchStore((s) => s.committedQuery);
  const setQuery = useSearchStore((s) => s.setQuery);
  const runSearch = useSearchStore((s) => s.runSearch);
  const clearSearch = useSearchStore((s) => s.clearSearch);

  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K focuses the search input from anywhere in the app.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      // Escape clears search when the input is focused
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        clearSearch();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch();
  };

  const handleClear = () => {
    clearSearch();
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-4 py-2 border-b border-parchment-border bg-parchment-surface shrink-0"
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search scripture…  (⌘K)"
          className="w-full px-3 py-1.5 pr-16 text-sm rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-2 focus:ring-parchment-accent/30 focus:border-parchment-accent"
          /* Disable the browser-native clear "×" since we render our own. */
          style={{ WebkitAppearance: 'none' }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-parchment-muted hover:text-parchment-text text-sm leading-none px-1"
            title="Clear (Esc)"
          >
            ×
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="px-3 py-1.5 text-sm rounded bg-parchment-accent text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
      {committedQuery && (
        <span className="text-xs text-parchment-muted shrink-0">
          Results for "<span className="font-semibold">{committedQuery}</span>"
        </span>
      )}
    </form>
  );
}
