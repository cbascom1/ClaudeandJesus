-- Migration 001: initial schema
-- Creates all 9 domain tables. FTS5 virtual table + triggers are in migration 002.

CREATE TABLE books (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  work         TEXT    NOT NULL CHECK (work IN ('bible', 'book_of_mormon', 'dc', 'pgp')),
  import_date  TEXT    NOT NULL DEFAULT (datetime('now')),
  source_file  TEXT,
  UNIQUE (title, work)
);

CREATE TABLE chapters (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id  INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  number   INTEGER NOT NULL,
  UNIQUE (book_id, number)
);

CREATE TABLE verses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id  INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  number      INTEGER NOT NULL,
  text        TEXT    NOT NULL,
  embedding   BLOB,
  UNIQUE (chapter_id, number)
);

CREATE TABLE topics (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT    NOT NULL UNIQUE,
  color  TEXT    NOT NULL DEFAULT '#8b4513'
);

CREATE TABLE verse_topics (
  verse_id   INTEGER NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  topic_id   INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  source     TEXT    NOT NULL CHECK (source IN ('ai', 'manual')),
  confirmed  INTEGER NOT NULL DEFAULT 0 CHECK (confirmed IN (0, 1)),
  PRIMARY KEY (verse_id, topic_id)
);

CREATE TABLE cross_references (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_verse  INTEGER NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  target_verse  INTEGER NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  note          TEXT,
  CHECK (source_verse != target_verse),
  UNIQUE (source_verse, target_verse)
);

CREATE TABLE notes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id  INTEGER NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  content   TEXT    NOT NULL,
  created   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE study_lists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  description  TEXT,
  created      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE study_list_verses (
  study_list_id  INTEGER NOT NULL REFERENCES study_lists(id) ON DELETE CASCADE,
  verse_id       INTEGER NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (study_list_id, verse_id)
);

-- Indexes for common lookups
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_verses_chapter_id ON verses(chapter_id);
CREATE INDEX idx_verse_topics_topic ON verse_topics(topic_id);
CREATE INDEX idx_verse_topics_verse ON verse_topics(verse_id);
CREATE INDEX idx_cross_refs_source ON cross_references(source_verse);
CREATE INDEX idx_cross_refs_target ON cross_references(target_verse);
CREATE INDEX idx_notes_verse ON notes(verse_id);
CREATE INDEX idx_study_list_verses_list ON study_list_verses(study_list_id);
CREATE INDEX idx_study_list_verses_sort ON study_list_verses(study_list_id, sort_order);
