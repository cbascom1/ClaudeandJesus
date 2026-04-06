import { useEffect, useState, useRef } from 'react';
import { useTagStore } from '../../stores/tagStore';

export function TopicChips({ verseId }: { verseId: number }) {
  const topics = useTagStore((s) => s.topics);
  const topicsLoaded = useTagStore((s) => s.topicsLoaded);
  const verseTopics = useTagStore((s) => s.verseTopics);
  const verseTopicsFor = useTagStore((s) => s.verseTopicsFor);
  const loadTopics = useTagStore((s) => s.loadTopics);
  const loadVerseTopics = useTagStore((s) => s.loadVerseTopics);
  const addTopicToVerse = useTagStore((s) => s.addTopicToVerse);
  const removeTopicFromVerse = useTagStore((s) => s.removeTopicFromVerse);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the catalog + this verse's topics on mount or when verseId changes.
  useEffect(() => {
    loadTopics();
    loadVerseTopics(verseId);
  }, [verseId, loadTopics, loadVerseTopics]);

  // Close picker on outside click.
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setFilterText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  // Focus the filter input when picker opens.
  useEffect(() => {
    if (pickerOpen) inputRef.current?.focus();
  }, [pickerOpen]);

  const currentTopics = verseTopicsFor === verseId ? verseTopics : [];
  const taggedIds = new Set(currentTopics.map((t) => t.id));

  // Available (untagged) topics filtered by text input.
  const available = topics
    .filter((t) => !taggedIds.has(t.id))
    .filter((t) => t.name.toLowerCase().includes(filterText.toLowerCase()));

  const handleAdd = async (topicId: number) => {
    await addTopicToVerse(verseId, topicId);
    setFilterText('');
    // Keep picker open so user can tag multiple.
  };

  const handleRemove = async (topicId: number) => {
    await removeTopicFromVerse(verseId, topicId);
  };

  if (!topicsLoaded) return <p className="text-xs text-parchment-muted">Loading topics…</p>;

  return (
    <div>
      {/* Currently tagged topics */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {currentTopics.length === 0 && (
          <p className="text-xs text-parchment-muted italic">No topics tagged.</p>
        )}
        {currentTopics.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: t.color + '22',
              color: t.color,
              border: `1px solid ${t.color}44`
            }}
          >
            {t.name}
            <button
              onClick={() => handleRemove(t.id)}
              className="hover:opacity-70 leading-none text-sm"
              title={`Remove "${t.name}"`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Add topic button / picker */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="text-xs px-2 py-1 rounded border border-parchment-border hover:bg-parchment-bg transition-colors"
        >
          + Add topic
        </button>

        {pickerOpen && (
          <div className="absolute z-40 mt-1 left-0 w-56 max-h-60 bg-parchment-surface border border-parchment-border rounded shadow-lg overflow-hidden flex flex-col">
            <div className="p-2 border-b border-parchment-border">
              <input
                ref={inputRef}
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter topics…"
                className="w-full text-xs px-2 py-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
              />
            </div>
            <ul className="flex-1 overflow-y-auto">
              {available.length === 0 && (
                <li className="px-3 py-2 text-xs text-parchment-muted italic">
                  {filterText ? 'No matching topics.' : 'All topics tagged.'}
                </li>
              )}
              {available.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => handleAdd(t.id)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-parchment-bg flex items-center gap-2 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
