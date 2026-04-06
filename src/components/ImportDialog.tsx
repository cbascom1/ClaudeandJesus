import { useEffect } from 'react';
import { useImport } from '../hooks/useImport';
import { useLibraryStore } from '../stores/libraryStore';

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const { state, start, setResolution, confirm, reset } = useImport();
  const loadBooks = useLibraryStore((s) => s.loadBooks);

  // Auto-start the picker when the dialog opens
  useEffect(() => {
    if (state.phase === 'idle') start();
  }, [state.phase, start]);

  // Reload books after successful import
  useEffect(() => {
    if (state.phase === 'done') loadBooks();
  }, [state.phase, loadBooks]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-parchment-surface border border-parchment-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-parchment-border flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Import Scripture</h2>
          <button
            onClick={handleClose}
            className="text-parchment-muted hover:text-parchment-text text-xl leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {(state.phase === 'picking' || state.phase === 'parsing') && (
            <div className="text-center py-8 text-parchment-muted">
              <p className="mb-2">
                {state.phase === 'picking' ? 'Select a file…' : 'Parsing…'}
              </p>
              {state.progress && (
                <p className="text-xs">{state.progress.message}</p>
              )}
            </div>
          )}

          {state.phase === 'preview' && state.parseResult && (
            <PreviewSection
              parseResult={state.parseResult}
              conflicts={state.conflicts}
              resolutions={state.resolutions}
              onResolutionChange={setResolution}
            />
          )}

          {state.phase === 'importing' && (
            <div className="py-8">
              <p className="mb-4 text-center">{state.progress?.message ?? 'Importing…'}</p>
              <ProgressBar
                current={state.progress?.current ?? 0}
                total={state.progress?.total ?? 1}
              />
            </div>
          )}

          {state.phase === 'done' && (
            <div className="text-center py-8">
              <p className="font-serif text-lg mb-2">Import complete!</p>
              <p className="text-sm text-parchment-muted">{state.summary}</p>
            </div>
          )}

          {state.phase === 'error' && (
            <div className="py-6">
              <p className="text-red-700 dark:text-red-400 font-medium mb-2">Import failed</p>
              <p className="text-sm text-parchment-muted font-mono">{state.error}</p>
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-parchment-border flex items-center justify-end gap-2">
          {state.phase === 'preview' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded border border-parchment-border hover:bg-parchment-bg"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                className="px-4 py-2 text-sm rounded bg-parchment-accent text-white font-medium hover:opacity-90"
              >
                Confirm Import
              </button>
            </>
          )}
          {(state.phase === 'done' || state.phase === 'error') && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded bg-parchment-accent text-white font-medium hover:opacity-90"
            >
              Close
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function PreviewSection({
  parseResult,
  conflicts,
  resolutions,
  onResolutionChange
}: {
  parseResult: import('@shared/ipc').ImportParseResult;
  conflicts: import('@shared/ipc').ImportConflict[];
  resolutions: Record<string, import('@shared/ipc').ImportConflictResolution>;
  onResolutionChange: (key: string, resolution: 'skip' | 'overwrite') => void;
}) {
  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-parchment-muted mb-1">Source file: {parseResult.sourceFile}</p>
        <div className="flex gap-6 text-sm">
          <span><strong>{parseResult.stats.bookCount}</strong> book(s)</span>
          <span><strong>{parseResult.stats.chapterCount}</strong> chapter(s)</span>
          <span><strong>{parseResult.stats.verseCount}</strong> verse(s)</span>
        </div>
      </div>

      {parseResult.books.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2">Detected books</h3>
          <ul className="text-sm space-y-1">
            {parseResult.books.map((b) => (
              <li key={`${b.work}:${b.title}`} className="flex items-center gap-2">
                <span>•</span>
                <span className="font-serif">{b.title}</span>
                <span className="text-xs text-parchment-muted">
                  ({b.chapters.length} ch, {b.chapters.reduce((n, c) => n + c.verses.length, 0)} v)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mb-4 p-3 border border-parchment-border rounded bg-parchment-bg">
          <h3 className="font-semibold text-sm mb-2">
            {conflicts.length} book(s) already exist in library
          </h3>
          <ul className="space-y-2">
            {conflicts.map((c) => {
              const key = `${c.book.work}:${c.book.title}`;
              return (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="font-serif">{c.book.title}</span>
                  <select
                    value={resolutions[key] ?? 'skip'}
                    onChange={(e) => onResolutionChange(key, e.target.value as 'skip' | 'overwrite')}
                    className="text-xs px-2 py-1 rounded border border-parchment-border bg-parchment-surface"
                  >
                    <option value="skip">Skip</option>
                    <option value="overwrite">Overwrite</option>
                  </select>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {parseResult.warnings.length > 0 && (
        <details className="mb-2">
          <summary className="cursor-pointer text-sm text-parchment-muted">
            {parseResult.warnings.length} warning(s)
          </summary>
          <ul className="mt-2 text-xs text-parchment-muted space-y-1 pl-4">
            {parseResult.warnings.slice(0, 20).map((w, i) => (
              <li key={i}>
                Line {w.line}: {w.message}
              </li>
            ))}
            {parseResult.warnings.length > 20 && (
              <li className="italic">…and {parseResult.warnings.length - 20} more</li>
            )}
          </ul>
        </details>
      )}
    </>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="h-2 bg-parchment-border rounded overflow-hidden">
        <div
          className="h-full bg-parchment-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-parchment-muted mt-1 text-center">
        {current} / {total}
      </p>
    </div>
  );
}
