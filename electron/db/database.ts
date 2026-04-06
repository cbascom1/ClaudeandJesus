import Database from 'better-sqlite3';
import { app } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Migrations imported as raw strings at build time (Vite ?raw suffix).
// To add a new migration: create the .sql file, import it here, append to MIGRATIONS.
// @ts-expect-error — Vite ?raw suffix returns string at runtime
import migration001 from './migrations/001_initial_schema.sql?raw';
// @ts-expect-error — Vite ?raw suffix returns string at runtime
import migration002 from './migrations/002_fts_setup.sql?raw';
// @ts-expect-error — Vite ?raw suffix returns string at runtime
import migration003 from './migrations/003_highlights_and_seed.sql?raw';

type Db = Database.Database;

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  { version: 1, name: '001_initial_schema', sql: migration001 as string },
  { version: 2, name: '002_fts_setup', sql: migration002 as string },
  { version: 3, name: '003_highlights_and_seed', sql: migration003 as string }
];

let dbInstance: Db | null = null;

/** Absolute path where the SQLite database file lives. */
export function getDbPath(): string {
  const userDataDir = app.getPath('userData');
  if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true });
  return join(userDataDir, 'scriptures.db');
}

/** Open (or return existing) database connection with proper pragmas. */
export function openDatabase(): Db {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  const db = new Database(dbPath);

  // These pragmas are PER-CONNECTION in SQLite — must set on every open.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Integers stay as JS number (not BigInt) so IPC serialization works.
  db.defaultSafeIntegers(false);

  assertFts5Available(db);
  runMigrations(db);

  dbInstance = db;
  console.log(`[db] Opened ${dbPath}`);
  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // Ignore checkpoint errors on close
    }
    dbInstance.close();
    dbInstance = null;
  }
}

function assertFts5Available(db: Db): void {
  const options = db.pragma('compile_options') as Array<{ compile_options: string }>;
  const hasFts5 = options.some((row) => row.compile_options === 'ENABLE_FTS5');
  if (!hasFts5) {
    throw new Error(
      'SQLite build does not include FTS5. Cannot initialize search. ' +
        'Check better-sqlite3 installation and electron-rebuild step.'
    );
  }
}

/** Simple forward-only migration runner. Runs each unapplied migration in its own transaction. */
function runMigrations(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedVersions = new Set(
    (
      db.prepare('SELECT version FROM schema_version').all() as Array<{ version: number }>
    ).map((r) => r.version)
  );

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    const tx = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
    });
    tx();
    console.log(`[db] Applied migration ${migration.name}`);
  }
}

/** Accessor for query modules — throws if DB hasn't been opened yet. */
export function getDb(): Db {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call openDatabase() first.');
  }
  return dbInstance;
}
