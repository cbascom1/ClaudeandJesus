import { useEffect } from 'react';
import { useAiStore } from '../../stores/aiStore';

export function AiSettingsPanel() {
  const sidecarStatus = useAiStore((s) => s.sidecarStatus);
  const sidecarLoading = useAiStore((s) => s.sidecarLoading);
  const sidecarError = useAiStore((s) => s.sidecarError);
  const embeddingStats = useAiStore((s) => s.embeddingStats);
  const embeddingProgress = useAiStore((s) => s.embeddingProgress);
  const isGenerating = useAiStore((s) => s.isGenerating);
  const startSidecar = useAiStore((s) => s.startSidecar);
  const stopSidecar = useAiStore((s) => s.stopSidecar);
  const refreshStatus = useAiStore((s) => s.refreshStatus);
  const generateEmbeddings = useAiStore((s) => s.generateEmbeddings);
  const loadEmbeddingStats = useAiStore((s) => s.loadEmbeddingStats);

  useEffect(() => {
    refreshStatus();
    loadEmbeddingStats();
  }, [refreshStatus, loadEmbeddingStats]);

  const running = sidecarStatus?.running ?? false;
  const embeddedPct =
    embeddingStats && embeddingStats.total > 0
      ? Math.round((embeddingStats.embedded / embeddingStats.total) * 100)
      : 0;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="font-serif text-xl mb-4">AI Settings</h2>

      {/* Sidecar status */}
      <section className="mb-6 p-4 border border-parchment-border rounded-lg">
        <h3 className="text-sm font-semibold mb-3">Local AI Model</h3>

        <div className="flex items-center gap-3 mb-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              running ? 'bg-green-500' : 'bg-parchment-muted'
            }`}
          />
          <span className="text-sm">
            {running ? 'Running' : 'Stopped'}
            {sidecarStatus?.model && (
              <span className="text-parchment-muted ml-2">({sidecarStatus.model})</span>
            )}
          </span>
        </div>

        {sidecarError && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-3">{sidecarError}</p>
        )}

        <div className="flex gap-2">
          {!running ? (
            <button
              onClick={() => void startSidecar()}
              disabled={sidecarLoading}
              className="text-xs px-3 py-1.5 rounded bg-parchment-accent text-white font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {sidecarLoading ? 'Starting…' : 'Start Model'}
            </button>
          ) : (
            <button
              onClick={() => void stopSidecar()}
              className="text-xs px-3 py-1.5 rounded border border-parchment-border hover:bg-parchment-bg transition-colors"
            >
              Stop Model
            </button>
          )}
          <button
            onClick={() => void refreshStatus()}
            className="text-xs px-3 py-1.5 rounded border border-parchment-border hover:bg-parchment-bg transition-colors"
          >
            Refresh
          </button>
        </div>

        <p className="text-xs text-parchment-muted mt-3">
          The local AI model (sentence-transformers) runs in a Python sidecar process. It powers
          semantic search and AI topic suggestions. Requires Python 3.10+ with dependencies installed.
        </p>
      </section>

      {/* Embeddings */}
      <section className="p-4 border border-parchment-border rounded-lg">
        <h3 className="text-sm font-semibold mb-3">Verse Embeddings</h3>

        {embeddingStats && (
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm">
                {embeddingStats.embedded.toLocaleString()} / {embeddingStats.total.toLocaleString()}{' '}
                verses embedded
              </span>
              <span className="text-xs text-parchment-muted">{embeddedPct}%</span>
            </div>
            <div className="h-2 bg-parchment-border rounded overflow-hidden">
              <div
                className="h-full bg-parchment-accent rounded transition-all duration-300"
                style={{ width: `${embeddedPct}%` }}
              />
            </div>
          </div>
        )}

        {isGenerating && embeddingProgress && (
          <div className="mb-3 p-3 bg-parchment-bg rounded border border-parchment-border">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium">{embeddingProgress.message}</span>
              <span className="text-xs text-parchment-muted">
                {embeddingProgress.current} / {embeddingProgress.total}
              </span>
            </div>
            <div className="h-1.5 bg-parchment-border rounded overflow-hidden">
              <div
                className="h-full bg-green-500 rounded transition-all"
                style={{
                  width: `${
                    embeddingProgress.total > 0
                      ? (embeddingProgress.current / embeddingProgress.total) * 100
                      : 0
                  }%`
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => void generateEmbeddings()}
            disabled={isGenerating || !running}
            className="text-xs px-3 py-1.5 rounded bg-parchment-accent text-white font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isGenerating ? 'Generating…' : 'Generate Embeddings'}
          </button>
          <button
            onClick={() => void loadEmbeddingStats()}
            className="text-xs px-3 py-1.5 rounded border border-parchment-border hover:bg-parchment-bg transition-colors"
          >
            Refresh Stats
          </button>
        </div>

        {!running && (
          <p className="text-xs text-parchment-muted mt-3">
            Start the AI model above before generating embeddings.
          </p>
        )}

        <p className="text-xs text-parchment-muted mt-3">
          Embeddings enable semantic search (finding verses by meaning, not just exact words) and AI
          topic suggestions. Generation processes all imported verses in batches.
        </p>
      </section>
    </div>
  );
}
