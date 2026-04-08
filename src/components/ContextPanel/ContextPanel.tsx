import { useEffect, useState } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import { TopicChips } from './TopicChips';
import { AiSuggestions } from './AiSuggestions';
import { NoteEditor } from './NoteEditor';
import { StudyListPicker } from './StudyListPicker';
import { WORK_LABELS } from '@shared/domain';
import type { VerseWithRef } from '@shared/domain';

export function ContextPanel() {
  const selectedVerseId = useLibraryStore((s) => s.selectedVerseId);
  const collapsed = useUiStore((s) => s.contextPanelCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleContextPanel);
  const [verse, setVerse] = useState<VerseWithRef | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedVerseId == null) {
      setVerse(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    window.api.db
      .getVerseById(selectedVerseId)
      .then((v) => {
        if (!cancelled) {
          setVerse(v);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[ContextPanel] getVerseById failed', err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVerseId]);

  if (collapsed) {
    return (
      <aside className="w-8 shrink-0 border-l border-parchment-border bg-parchment-surface flex flex-col">
        <button
          onClick={toggleCollapsed}
          className="w-full py-3 text-parchment-muted hover:text-parchment-text hover:bg-parchment-bg transition-colors"
          title="Expand context panel"
        >
          ‹
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[320px] shrink-0 border-l border-parchment-border bg-parchment-surface flex flex-col">
      <header className="px-4 py-3 border-b border-parchment-border flex items-center justify-between">
        <h3 className="font-serif text-sm font-semibold">Context</h3>
        <button
          onClick={toggleCollapsed}
          className="text-parchment-muted hover:text-parchment-text text-sm"
          title="Collapse context panel"
        >
          ›
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 text-sm">
        {!selectedVerseId && (
          <p className="text-parchment-muted italic">
            Click a verse to see its metadata, topics, notes, and cross-references.
          </p>
        )}

        {loading && <p className="text-parchment-muted">Loading…</p>}

        {verse && !loading && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-parchment-muted uppercase tracking-wide mb-1">
                Reference
              </p>
              <p className="font-serif text-lg">
                {verse.book_title} {verse.chapter_number}:{verse.number}
              </p>
              <p className="text-xs text-parchment-muted">{WORK_LABELS[verse.book_work]}</p>
            </div>

            <div>
              <p className="text-xs text-parchment-muted uppercase tracking-wide mb-1">
                Verse
              </p>
              <p className="scripture-text text-sm">{verse.text}</p>
            </div>

            <ContextSection title="Topics">
              <TopicChips verseId={verse.id} />
              <AiSuggestions verseId={verse.id} verseText={verse.text} />
            </ContextSection>

            <ContextSection title="Study Lists">
              <StudyListPicker verseId={verse.id} />
            </ContextSection>

            <ContextSection title="Notes">
              <NoteEditor verseId={verse.id} />
            </ContextSection>

            <ContextSection title="Cross-references">
              <p className="text-xs text-parchment-muted italic">
                Cross-references come in Phase 7.
              </p>
            </ContextSection>
          </div>
        )}
      </div>
    </aside>
  );
}

function ContextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-parchment-muted uppercase tracking-wide mb-1">{title}</p>
      {children}
    </div>
  );
}
