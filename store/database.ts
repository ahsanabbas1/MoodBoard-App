import * as SQLite from "expo-sqlite";
import { MoodEntry, MoodLevel } from "../types";

const DATABASE_NAME = "moodboard.db";
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

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_mood_entries (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
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

export async function getEntries(userId: string): Promise<MoodEntry[]> {
  const db = await getDb();
  const result = await db.getAllAsync<any>(
    "SELECT * FROM user_mood_entries WHERE user_id = ? ORDER BY createdAt DESC",
    [userId]
  );

  return result.map((row) => ({
    ...row,
    intensity: row.intensity ?? 5,
    tags: row.tags ? JSON.parse(row.tags) : [],
  }));
}

export async function insertEntry(userId: string, entry: MoodEntry) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO user_mood_entries (id, user_id, date, time, mood, intensity, note, tags, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      entry.id,
      userId,
      entry.date,
      entry.time,
      entry.mood,
      entry.intensity,
      entry.note,
      JSON.stringify(entry.tags),
      entry.createdAt,
    ],
  );
}

export async function removeEntry(userId: string, id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM user_mood_entries WHERE id = ? AND user_id = ?", [id, userId]);
}

export async function clearAllEntries(userId: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM user_mood_entries WHERE user_id = ?", [userId]);
}
