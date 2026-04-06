import { useEffect } from 'react';
import { LibraryTree } from './components/Sidebar/LibraryTree';
import { ChapterView } from './components/ReadingView/ChapterView';
import { TabBar } from './components/TabBar/TabBar';
import { ContextPanel } from './components/ContextPanel/ContextPanel';
import { ImportDialog } from './components/ImportDialog';
import { SearchBar } from './components/SearchBar/SearchBar';
import { SearchResults } from './components/SearchResults/SearchResults';
import { TopicExplorer } from './components/TopicExplorer/TopicExplorer';
import { useLibraryStore } from './stores/libraryStore';
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

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  return (
    <div className="flex h-full w-full bg-parchment-bg text-parchment-text">
      {/* Left Sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-parchment-border bg-parchment-surface flex flex-col">
        <header className="px-4 py-3 border-b border-parchment-border flex items-center justify-between">
          <h1 className="font-serif text-lg font-semibold">Scripture Study</h1>
          <button
            onClick={toggleTheme}
            className="text-xs px-2 py-1 rounded border border-parchment-border hover:bg-parchment-bg transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </header>

        {/* Sidebar nav: Library / Topics */}
        <nav className="flex border-b border-parchment-border shrink-0">
          <button
            onClick={() => setMainView('library')}
            className={`flex-1 text-xs py-2 text-center transition-colors ${
              mainView === 'library'
                ? 'font-semibold border-b-2 border-parchment-accent text-parchment-text'
                : 'text-parchment-muted hover:text-parchment-text hover:bg-parchment-bg'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setMainView('topics')}
            className={`flex-1 text-xs py-2 text-center transition-colors ${
              mainView === 'topics'
                ? 'font-semibold border-b-2 border-parchment-accent text-parchment-text'
                : 'text-parchment-muted hover:text-parchment-text hover:bg-parchment-bg'
            }`}
          >
            Topics
          </button>
        </nav>

        {mainView === 'library' ? <LibraryTree /> : (
          <div className="flex-1 overflow-y-auto text-xs text-parchment-muted px-4 py-3">
            <p className="italic">Select Topics tab in main view to explore</p>
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
