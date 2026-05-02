import * as SQLite from 'expo-sqlite';
import { MoodEntry, MoodLevel } from '../types';

const DATABASE_NAME = 'moodboard.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (databasePromise) {
    return databasePromise;
  }
  
  databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
}

export async function initDatabase() {
  const db = await getDb();

  // Create entries table
  // Adding intensity column
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS mood_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      mood INTEGER NOT NULL,
      intensity INTEGER DEFAULT 5,
      note TEXT,
      tags TEXT,
      createdAt INTEGER NOT NULL
    );
  `);

  return db;
}

export async function getEntries(): Promise<MoodEntry[]> {
  const db = await getDb();
  const result = await db.getAllAsync<any>('SELECT * FROM mood_entries ORDER BY createdAt DESC');
  
  return result.map(row => ({
    ...row,
    intensity: row.intensity ?? 5,
    tags: row.tags ? JSON.parse(row.tags) : []
  }));
}

export async function insertEntry(entry: MoodEntry) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO mood_entries (id, date, time, mood, intensity, note, tags, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [entry.id, entry.date, entry.time, entry.mood, entry.intensity, entry.note, JSON.stringify(entry.tags), entry.createdAt]
  );
}

export async function insertEntries(entries: MoodEntry[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        'INSERT INTO mood_entries (id, date, time, mood, intensity, note, tags, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [entry.id, entry.date, entry.time, entry.mood, entry.intensity ?? 5, entry.note, JSON.stringify(entry.tags), entry.createdAt]
      );
    }
  });
}

export async function removeEntry(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM mood_entries WHERE id = ?', [id]);
}

export async function clearAllEntries() {
  const db = await getDb();
  await db.runAsync('DELETE FROM mood_entries');
}
