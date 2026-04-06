import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ImportConflict,
  ImportConflictResolution,
  ImportParseResult,
  ImportProgressEvent
} from '@shared/ipc';

type Phase = 'idle' | 'picking' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

interface UseImportState {
  phase: Phase;
  progress: ImportProgressEvent | null;
  parseResult: ImportParseResult | null;
  conflicts: ImportConflict[];
  resolutions: Record<string, ImportConflictResolution>;
  error: string | null;
  summary: string | null;
}

export function useImport() {
  const [state, setState] = useState<UseImportState>({
    phase: 'idle',
    progress: null,
    parseResult: null,
    conflicts: [],
    resolutions: {},
    error: null,
    summary: null
  });

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = window.api.import.onProgress((event) => {
      setState((s) => ({ ...s, progress: event }));
    });
    unsubRef.current = unsub;
    return () => {
      unsubRef.current?.();
    };
  }, []);

  const start = useCallback(async () => {
    setState((s) => ({ ...s, phase: 'picking', error: null }));
    try {
      const filePath = await window.api.import.pickFile();
      if (!filePath) {
        setState((s) => ({ ...s, phase: 'idle' }));
        return;
      }

      setState((s) => ({ ...s, phase: 'parsing' }));
      const parseResult = await window.api.import.parseFile(filePath);

      const conflicts = await window.api.import.detectConflicts(parseResult);
      // Default all conflicts to 'skip' until user chooses
      const resolutions: Record<string, ImportConflictResolution> = {};
      for (const c of conflicts) {
        resolutions[`${c.book.work}:${c.book.title}`] = 'skip';
      }

      setState((s) => ({
        ...s,
        phase: 'preview',
        parseResult,
        conflicts,
        resolutions
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : String(err)
      }));
    }
  }, []);

  const setResolution = useCallback(
    (key: string, resolution: ImportConflictResolution) => {
      setState((s) => ({ ...s, resolutions: { ...s.resolutions, [key]: resolution } }));
    },
    []
  );

  const confirm = useCallback(async () => {
    const { parseResult, resolutions } = state;
    if (!parseResult) return;
    setState((s) => ({ ...s, phase: 'importing' }));
    try {
      const response = await window.api.import.confirmImport({
        parseResult,
        conflictResolutions: resolutions
      });
      const insertedCount = response.inserted.reduce((n, b) => n + b.verseCount, 0);
      const summary =
        `Imported ${response.inserted.length} book(s), ${insertedCount} verses.` +
        (response.skipped.length > 0
          ? ` Skipped ${response.skipped.length} existing book(s).`
          : '');
      setState((s) => ({ ...s, phase: 'done', summary }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : String(err)
      }));
    }
  }, [state]);

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      progress: null,
      parseResult: null,
      conflicts: [],
      resolutions: {},
      error: null,
      summary: null
    });
  }, []);

  return { state, start, setResolution, confirm, reset };
}
