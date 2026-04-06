import { useLibraryStore } from '../../stores/libraryStore';

export function TabBar() {
  const tabs = useLibraryStore((s) => s.tabs);
  const activeTabId = useLibraryStore((s) => s.activeTabId);
  const setActiveTab = useLibraryStore((s) => s.setActiveTab);
  const closeTab = useLibraryStore((s) => s.closeTab);

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-end border-b border-parchment-border bg-parchment-bg overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-2 pl-3 pr-1 py-1.5 border-r border-parchment-border cursor-pointer max-w-[200px] group ${
              isActive
                ? 'bg-parchment-surface border-b-2 border-b-parchment-accent -mb-px'
                : 'text-parchment-muted hover:bg-parchment-surface/50'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-xs truncate font-serif">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="text-parchment-muted hover:text-parchment-text text-sm leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-parchment-border opacity-60 group-hover:opacity-100"
              title="Close tab"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
