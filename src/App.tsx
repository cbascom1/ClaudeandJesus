import { useEffect, useCallback } from 'react';
import { LibraryTree } from './components/Sidebar/LibraryTree';
import { ChapterView } from './components/ReadingView/ChapterView';
import { TabBar } from './components/TabBar/TabBar';
import { ContextPanel } from './components/ContextPanel/ContextPanel';
import { ImportDialog } from './components/ImportDialog';
import { SearchBar } from './components/SearchBar/SearchBar';
import { SearchResults } from './components/SearchResults/SearchResults';
import { TopicExplorer } from './components/TopicExplorer/TopicExplorer';
import { StudyListExplorer } from './components/StudyLists/StudyListExplorer';
import { useLibraryStore, useActiveTab } from './stores/libraryStore';
import { useUiStore } from './stores/uiStore';
import { useSearchStore } from './stores/searchStore';

export function App() {
  const loadBooks = useLibraryStore((s) => s.loadBooks);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const mainView = useUiStore((s) => s.mainView);
  const setMainView = useUiStore((s) => s.setMainView);
  const importDialogOpen = useUiStore((s) => s.importDialogOpen);
  const setImportDialogOpen = useUiStore((s) => s.setImportDialogOpen);
  const committedQuery = useSearchStore((s) => s.committedQuery);

  const activeTab = useActiveTab();
  const chaptersByBook = useLibraryStore((s) => s.chaptersByBook);
  const openChapterInTab = useLibraryStore((s) => s.openChapterInTab);
  const closeTab = useLibraryStore((s) => s.closeTab);
  const activeTabId = useLibraryStore((s) => s.activeTabId);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Cmd+I — open import dialog
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i' && !e.shiftKey) {
        e.preventDefault();
        setImportDialogOpen(true);
        return;
      }

      // Cmd+W — close active tab
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'w') {
        if (activeTabId) {
          e.preventDefault();
          closeTab(activeTabId);
        }
        return;
      }

      // Arrow keys for chapter navigation (only when not in an input)
      if (!isInput && mainView === 'library' && activeTab) {
        const chapters = chaptersByBook[activeTab.bookId];
        if (!chapters) return;
        const idx = chapters.findIndex((c) => c.id === activeTab.chapterId);
        if (idx < 0) return;

        if (e.key === 'ArrowLeft' && idx > 0) {
          e.preventDefault();
          openChapterInTab(activeTab.bookId, chapters[idx - 1].id);
        } else if (e.key === 'ArrowRight' && idx < chapters.length - 1) {
          e.preventDefault();
          openChapterInTab(activeTab.bookId, chapters[idx + 1].id);
        }
      }
    },
    [activeTab, activeTabId, chaptersByBook, closeTab, mainView, openChapterInTab, setImportDialogOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-full w-full bg-parchment-bg text-parchment-text">
      {/* Left Sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-parchment-border bg-parchment-surface flex flex-col">
        <header className="px-4 py-3 border-b border-parchment-border flex items-center justify-between">
          <h1 className="font-serif text-lg font-semibold">Scripture Study</h1>
          <button
            onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-parchment-border hover:bg-parchment-bg transition-colors text-parchment-muted hover:text-parchment-text"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            )}
          </button>
        </header>

        {/* Sidebar nav: Library / Topics */}
        <nav className="flex border-b border-parchment-border shrink-0">
          {(['library', 'topics', 'lists'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setMainView(view)}
              className={`flex-1 text-xs py-2 text-center transition-colors ${
                mainView === view
                  ? 'font-semibold border-b-2 border-parchment-accent text-parchment-text'
                  : 'text-parchment-muted hover:text-parchment-text hover:bg-parchment-bg'
              }`}
            >
              {view === 'library' ? 'Library' : view === 'topics' ? 'Topics' : 'Lists'}
            </button>
          ))}
        </nav>

        {mainView === 'library' ? (
          <LibraryTree />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-center text-center">
            <p className="text-parchment-muted text-2xl mb-2">
              {mainView === 'topics' ? '# ' : '\u2630'}
            </p>
            <p className="text-xs text-parchment-muted">
              {mainView === 'topics'
                ? 'Browse and manage topics in the main panel'
                : 'Manage study lists in the main panel'}
            </p>
          </div>
        )}

        <footer className="p-3 border-t border-parchment-border">
          <button
            onClick={() => setImportDialogOpen(true)}
            className="w-full px-3 py-2 rounded bg-parchment-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Import Scripture
          </button>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <SearchBar />
        {committedQuery ? (
          <SearchResults />
        ) : mainView === 'topics' ? (
          <TopicExplorer />
        ) : mainView === 'lists' ? (
          <StudyListExplorer />
        ) : (
          <>
            <TabBar />
            <ChapterView />
          </>
        )}
      </main>

      {/* Right Context Panel */}
      <ContextPanel />

      {/* Modals */}
      {importDialogOpen && <ImportDialog onClose={() => setImportDialogOpen(false)} />}
    </div>
  );
}
