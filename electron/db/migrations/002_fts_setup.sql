-- Migration 002: FTS5 full-text search for verses
-- Uses contentless-linked virtual table pattern: verses remains source of truth,
-- FTS mirrors `text` column, kept in sync automatically via triggers.

CREATE VIRTUAL TABLE verses_fts USING fts5(
  text,
  content='verses',
  content_rowid='id',
  tokenize='porter unicode61 remove_diacritics 2'
);

-- Backfill existing rows (no-op on first run, safe on re-index)
INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses;

-- Keep FTS in sync with verses
CREATE TRIGGER verses_ai AFTER INSERT ON verses BEGIN
  INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER verses_ad AFTER DELETE ON verses BEGIN
  INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
END;

CREATE TRIGGER verses_au AFTER UPDATE ON verses BEGIN
  INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
  INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
END;
