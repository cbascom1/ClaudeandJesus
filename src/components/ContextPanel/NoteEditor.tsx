import { useEffect, useState, useRef } from 'react';
import { useNoteStore } from '../../stores/noteStore';

export function NoteEditor({ verseId }: { verseId: number }) {
  const notes = useNoteStore((s) => s.notes);
  const notesFor = useNoteStore((s) => s.notesFor);
  const loading = useNoteStore((s) => s.loading);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const createNote = useNoteStore((s) => s.createNote);
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);

  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadNotes(verseId);
  }, [verseId, loadNotes]);

  const currentNotes = notesFor === verseId ? notes : [];

  const handleCreate = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    await createNote(verseId, trimmed);
    setNewContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleCreate();
    }
  };

  const startEdit = (noteId: number, content: string) => {
    setEditingId(noteId);
    setEditContent(content);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const trimmed = editContent.trim();
    if (!trimmed) return;
    await updateNote(editingId, trimmed);
    setEditingId(null);
    setEditContent('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void saveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDelete = async (noteId: number) => {
    const ok = confirm('Delete this note?');
    if (!ok) return;
    await deleteNote(noteId);
  };

  if (loading && notesFor !== verseId) {
    return <p className="text-xs text-parchment-muted">Loading notes…</p>;
  }

  return (
    <div>
      {/* Existing notes */}
      {currentNotes.length > 0 && (
        <ul className="space-y-2 mb-2">
          {currentNotes.map((note) => (
            <li
              key={note.id}
              className="group text-xs p-2 rounded border border-parchment-border bg-parchment-bg"
            >
              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="w-full text-xs p-1.5 rounded border border-parchment-border bg-parchment-surface focus:outline-none focus:ring-1 focus:ring-parchment-accent/30 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={() => void saveEdit()}
                      className="text-xs px-2 py-0.5 rounded bg-parchment-accent text-white hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs px-2 py-0.5 text-parchment-muted hover:text-parchment-text"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-parchment-muted">
                      {new Date(note.updated).toLocaleDateString()}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                      <button
                        onClick={() => startEdit(note.id, note.content)}
                        className="text-parchment-muted hover:text-parchment-text"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(note.id)}
                        className="text-parchment-muted hover:text-red-500"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {currentNotes.length === 0 && (
        <p className="text-xs text-parchment-muted italic mb-2">No notes yet.</p>
      )}

      {/* New note input */}
      <div>
        <textarea
          ref={textareaRef}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note…"
          className="w-full text-xs p-2 rounded border border-parchment-border bg-parchment-bg focus:outline-none focus:ring-1 focus:ring-parchment-accent/30 resize-none"
          rows={2}
        />
        <button
          onClick={() => void handleCreate()}
          disabled={!newContent.trim()}
          className="mt-1 text-xs px-2.5 py-1 rounded bg-parchment-accent text-white font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Save Note
        </button>
        <span className="text-[10px] text-parchment-muted ml-2">Cmd+Enter</span>
      </div>
    </div>
  );
}
