import * as SQLite from 'expo-sqlite';

export type ExpiryItemRow = {
  id: string;
  name: string;
  icon: string;
  expiry_date: string; // ISO date string, e.g. "2026-07-14"
  added_date: string;
  opened_date: string | null;
  location: string | null;
  reminder_enabled: number; // 0 | 1
  reminder_days_before: number;
  updated_at: string; // ISO datetime, used for last-write-wins sync merges
};

export type LastTimeTaskRow = {
  id: string;
  name: string;
  icon: string;
  last_done_date: string;
  repeat_interval_days: number | null;
  reminder_enabled: number; // 0 | 1
  updated_at: string; // ISO datetime, used for last-write-wins sync merges
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS expiry_items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  added_date TEXT NOT NULL,
  opened_date TEXT,
  location TEXT,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_days_before INTEGER NOT NULL DEFAULT 2,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS last_time_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  last_done_date TEXT NOT NULL,
  repeat_interval_days INTEGER,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('freshkeep.db');
  }
  return db;
}

export function setTestDb(next: SQLite.SQLiteDatabase | null): void {
  db = next;
}

export function migrate(): void {
  getDb().execSync(SCHEMA_SQL);
}
