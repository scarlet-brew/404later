import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM has no __dirname — reconstruct it from the module URL.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This file lives in src/db/, so the project root is two levels up.
// DATABASE_PATH lets tests point at a throwaway database instead of the real one.
const databasePath =
  process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'bookmarks.db');

// verbose: console.log prints every SQL statement to the terminal — handy while learning.
const db = new Database(databasePath, { verbose: console.log });

// Enforce foreign key constraints (off by default in SQLite).
db.pragma('foreign_keys = ON');

// Create the bookmarks table if it doesn't already exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    url         TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT,
    tags        TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
