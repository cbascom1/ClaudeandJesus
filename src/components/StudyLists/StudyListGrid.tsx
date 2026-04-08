import { useEffect, useState } from 'react';
import { useStudyListStore } from '../../stores/studyListStore';

export function StudyListGrid({ onSelectList }: { onSelectList: (id: number) => void }) {
  const stats = useStudyListStore((s) => s.stats);
  const loading = useStudyListStore((s) => s.loading);
  const loadStats = useStudyListStore((s) => s.loadStats);
  const loadLists = useStudyListStore((s) => s.loadLists);
  const createList = useStudyListStore((s) => s.createList);
  const deleteList = useStudyListStore((s) => s.deleteList);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadLists();
    loadStats();
  }, [loadLists, loadStats]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createList(trimmed, newDesc.trim() || null);
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
    await loadStats();
  };

  const handleDelete = async (id: number, name: string, verseCount: number) => {
    const msg = verseCount > 0
      ? `Delete "${name}"? This list has ${verseCount} verse(s).`
      : `Delete "${name}"?`;
    if (!confirm(msg)) return;
    await deleteList(id);
    await loadStats();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl">Study Lists</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs px-3 py-1.5 rounded bg-parchment-accent text-white font-medium hover:opacity-90 transition-opacity"
        >
          + New List
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 p-3 border border-parchment-border rounded bg-parchment-bg space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="List name"
            className="w-full text-sm px-2 py-1.5 rounded border border-parchment-border bg-parchment-surface focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full text-sm px-2 py-1.5 rounded border border-parchment-border bg-parchment-surface focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!newName.trim()}
              className="text-xs px-3 py-1.5 rounded bg-parchment-accent text-white font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs px-2 py-1.5 text-parchment-muted hover:text-parchment-text"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-parchment-muted text-sm">Loading…</p>}

      {!loading && stats.length === 0 && (
        <div className="text-center py-12">
          <p className="text-parchment-muted text-sm italic mb-2">No study lists yet.</p>
          <p className="text-parchment-muted text-xs">
            Create a list to collect and organize verses for focused study.
          </p>
        </div>
      )}

      <div className="space-y-2 max-w-2xl">
        {stats.map((stat) => (
          <div
            key={stat.id}
            onClick={() => onSelectList(stat.id)}
            className="group flex items-center gap-4 p-4 border border-parchment-border rounded-lg hover:border-parchment-accent/40 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{stat.name}</h3>
              {stat.description && (
                <p className="text-xs text-parchment-muted truncate mt-0.5">{stat.description}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold">{stat.verse_count}</span>
              <span className="text-xs text-parchment-muted ml-1">
                verse{stat.verse_count === 1 ? '' : 's'}
              </span>
            </div>
            <span className="text-xs text-parchment-muted shrink-0">
              {new Date(stat.created).toLocaleDateString()}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete(stat.id, stat.name, stat.verse_count);
              }}
              className="text-parchment-muted hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs transition-opacity shrink-0"
              title={`Delete "${stat.name}"`}
            >
              &#x2715;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
