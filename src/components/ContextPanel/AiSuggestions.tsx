import { useState } from 'react';
import { useAiStore } from '../../stores/aiStore';
import { useTagStore } from '../../stores/tagStore';

interface AiSuggestionsProps {
  verseId: number;
  verseText: string;
}

export function AiSuggestions({ verseId, verseText }: AiSuggestionsProps) {
  const suggestions = useAiStore((s) => s.suggestions);
  const suggestionsFor = useAiStore((s) => s.suggestionsFor);
  const suggestionsLoading = useAiStore((s) => s.suggestionsLoading);
  const classifyVerse = useAiStore((s) => s.classifyVerse);
  const clearSuggestions = useAiStore((s) => s.clearSuggestions);
  const addTopicToVerse = useTagStore((s) => s.addTopicToVerse);

  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const isCurrentVerse = suggestionsFor?.verseId === verseId;
  const activeSuggestions = isCurrentVerse ? suggestions : [];

  const handleSuggest = () => {
    setConfirmed(new Set());
    setDismissed(new Set());
    void classifyVerse(verseId, verseText);
  };

  const handleConfirm = async (topicId: number) => {
    await addTopicToVerse(verseId, topicId);
    setConfirmed((prev) => new Set([...prev, topicId]));
  };

  const handleDismiss = (topicId: number) => {
    setDismissed((prev) => new Set([...prev, topicId]));
  };

  const handleConfirmAll = async () => {
    for (const s of activeSuggestions) {
      if (!confirmed.has(s.topicId) && !dismissed.has(s.topicId)) {
        await addTopicToVerse(verseId, s.topicId);
        setConfirmed((prev) => new Set([...prev, s.topicId]));
      }
    }
  };

  const visibleSuggestions = activeSuggestions.filter(
    (s) => !confirmed.has(s.topicId) && !dismissed.has(s.topicId)
  );

  const confirmedSuggestions = activeSuggestions.filter((s) => confirmed.has(s.topicId));

  return (
    <div className="mt-2">
      <button
        onClick={handleSuggest}
        disabled={suggestionsLoading}
        className="text-xs px-2 py-1 rounded border border-parchment-border hover:bg-parchment-bg transition-colors inline-flex items-center gap-1"
        title="Use AI to suggest topics for this verse"
      >
        {suggestionsLoading && isCurrentVerse ? (
          <>
            <span className="inline-block w-3 h-3 border border-parchment-muted border-t-parchment-accent rounded-full animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <span className="text-sm leading-none">&#x2728;</span>
            Suggest Topics
          </>
        )}
      </button>

      {isCurrentVerse && visibleSuggestions.length > 0 && (
        <div className="mt-2 p-2 border border-parchment-accent/30 rounded bg-parchment-bg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-parchment-muted uppercase tracking-wide">
              AI Suggestions
            </span>
            <button
              onClick={() => void handleConfirmAll()}
              className="text-xs px-1.5 py-0.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Accept All
            </button>
          </div>
          <ul className="space-y-1">
            {visibleSuggestions.map((s) => (
              <li key={s.topicId} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{s.topicName}</span>
                <span className="text-parchment-muted shrink-0">
                  {Math.round(s.score * 100)}%
                </span>
                <button
                  onClick={() => void handleConfirm(s.topicId)}
                  className="px-1.5 py-0.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                  title="Confirm"
                >
                  &#x2713;
                </button>
                <button
                  onClick={() => handleDismiss(s.topicId)}
                  className="px-1.5 py-0.5 rounded border border-parchment-border hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Dismiss"
                >
                  &#x2715;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmedSuggestions.length > 0 && (
        <p className="text-xs text-green-600 mt-1">
          {confirmedSuggestions.length} topic{confirmedSuggestions.length === 1 ? '' : 's'} added.
        </p>
      )}

      {isCurrentVerse &&
        !suggestionsLoading &&
        activeSuggestions.length === 0 &&
        suggestionsFor != null && (
          <p className="text-xs text-parchment-muted italic mt-1">
            No topic suggestions. Make sure the AI model is running and embeddings are generated (Topics
            → AI Settings).
          </p>
        )}

      {isCurrentVerse && visibleSuggestions.length === 0 && confirmedSuggestions.length === 0 && dismissed.size > 0 && (
        <button
          onClick={clearSuggestions}
          className="text-xs text-parchment-muted hover:text-parchment-text mt-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}
