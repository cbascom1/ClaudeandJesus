import { useEffect, useState } from 'react';
import { useTagStore } from '../../stores/tagStore';
import type { TopicStat } from '@shared/ipc';

export function TopicGrid({ onSelectTopic }: { onSelectTopic: (id: number) => void }) {
  const topicStats = useTagStore((s) => s.topicStats);
  const explorerLoading = useTagStore((s) => s.explorerLoading);
  const loadTopics = useTagStore((s) => s.loadTopics);
  const loadTopicStats = useTagStore((s) => s.loadTopicStats);
  const createTopic = useTagStore((s) => s.createTopic);
  const deleteTopic = useTagStore((s) => s.deleteTopic);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');

  useEffect(() => {
    // Load both the topic catalog (for TopicDetail lookups) and stats.
    loadTopics();
    loadTopicStats();
  }, [loadTopics, loadTopicStats]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createTopic(trimmed, newColor);
    setNewName('');
    setShowCreate(false);
    await loadTopicStats();
  };

  const handleDelete = async (stat: TopicStat) => {
    if (stat.verse_count > 0) {
      const ok = confirm(
        `Delete "${stat.name}"? This will remove it from ${stat.verse_count} tagged verse(s).`
      );
      if (!ok) return;
    }
    await deleteTopic(stat.id);
    await loadTopicStats();
  };

  const maxCount = Math.max(1, ...topicStats.map((s) => s.verse_count));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl">Topic Explorer</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs px-3 py-1.5 rounded bg-parchment-accent text-white font-medium hover:opacity-90 transition-opacity"
        >
          + New Topic
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 flex items-center gap-2 p-3 border border-parchment-border rounded bg-parchment-bg">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Topic name"
            className="flex-1 text-sm px-2 py-1 rounded border border-parchment-border bg-parchment-surface focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
            autoFocus
          />
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
        </form>
      )}

      {explorerLoading && <p className="text-parchment-muted text-sm">Loading…</p>}

      {!explorerLoading && topicStats.length === 0 && (
        <p className="text-parchment-muted text-sm italic">No topics yet.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl">
        {topicStats.map((stat) => (
          <div
            key={stat.id}
            className="group relative border border-parchment-border rounded-lg p-3 hover:border-parchment-accent/40 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => onSelectTopic(stat.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: stat.color }}
              />
              <span className="text-sm font-medium truncate">{stat.name}</span>
            </div>
            <div className="text-xs text-parchment-muted mb-1">
              {stat.verse_count} verse{stat.verse_count === 1 ? '' : 's'}
            </div>
            {/* Mini bar chart */}
            <div className="h-1.5 bg-parchment-border rounded overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(stat.verse_count / maxCount) * 100}%`,
                  backgroundColor: stat.color
                }}
              />
            </div>
            {/* Delete button — visible on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(stat);
              }}
              className="absolute top-1.5 right-1.5 text-parchment-muted hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs transition-opacity"
              title={`Delete "${stat.name}"`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
