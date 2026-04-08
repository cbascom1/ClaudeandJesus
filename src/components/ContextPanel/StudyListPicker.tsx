import { useEffect, useState, useRef } from 'react';
import { useStudyListStore } from '../../stores/studyListStore';

export function StudyListPicker({ verseId }: { verseId: number }) {
  const lists = useStudyListStore((s) => s.lists);
  const listsLoaded = useStudyListStore((s) => s.listsLoaded);
  const loadLists = useStudyListStore((s) => s.loadLists);
  const createList = useStudyListStore((s) => s.createList);
  const addVerseToList = useStudyListStore((s) => s.addVerseToList);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [addedTo, setAddedTo] = useState<Set<number>>(new Set());
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  // Close on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setFilterText('');
        setShowCreate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  useEffect(() => {
    if (pickerOpen) inputRef.current?.focus();
  }, [pickerOpen]);

  // Reset "added" indicators when verse changes
  useEffect(() => {
    setAddedTo(new Set());
  }, [verseId]);

  const filtered = lists.filter((l) =>
    l.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleAdd = async (listId: number) => {
    await addVerseToList(listId, verseId);
    setAddedTo((prev) => new Set([...prev, listId]));
  };

  const handleCreateAndAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const list = await createList(trimmed, null);
    await addVerseToList(list.id, verseId);
    setAddedTo((prev) => new Set([...prev, list.id]));
    setNewName('');
    setShowCreate(false);
  };

  if (!listsLoaded) return null;

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        className="text-xs px-2 py-1 rounded border border-parchment-border hover:bg-parchment-bg transition-colors"
      >
        + Add to List
      </button>

      {pickerOpen && (
        <div className="absolute z-40 mt-1 left-0 w-56 max-h-64 bg-parchment-surface border border-parchment-border rounded shadow-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b border-parchment-border">
            <input
              ref={inputRef}
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter lists…"
              className="w-full text-xs px-2 py-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
            />
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 && !showCreate && (
              <li className="px-3 py-2 text-xs text-parchment-muted italic">
                {filterText ? 'No matching lists.' : 'No study lists yet.'}
              </li>
            )}
            {filtered.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => void handleAdd(l.id)}
                  disabled={addedTo.has(l.id)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-parchment-bg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <span className="flex-1 truncate">{l.name}</span>
                  {addedTo.has(l.id) && (
                    <span className="text-green-600 text-[10px]">&#x2713; Added</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-parchment-border p-2">
            {showCreate ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleCreateAndAdd();
                    if (e.key === 'Escape') setShowCreate(false);
                  }}
                  placeholder="List name"
                  className="flex-1 text-xs px-2 py-1 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30"
                  autoFocus
                />
                <button
                  onClick={() => void handleCreateAndAdd()}
                  disabled={!newName.trim()}
                  className="text-xs px-2 py-1 rounded bg-parchment-accent text-white hover:opacity-90 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full text-left text-xs px-1 py-1 text-parchment-muted hover:text-parchment-text transition-colors"
              >
                + Create New List
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
