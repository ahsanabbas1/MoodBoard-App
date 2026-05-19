import * as SQLite from "expo-sqlite";
import { MoodEntry } from "../types";

const DATABASE_NAME = "moodboard.db";
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (databasePromise) return databasePromise;
  databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
}

export async function initDatabase() {
  try {
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
        createdAt INTEGER NOT NULL,
        timeZone TEXT
      );
    `);

    await db.execAsync(`
      ALTER TABLE user_mood_entries ADD COLUMN timeZone TEXT;
    `).catch(() => {});

    // Emotion wheel columns — safe to run on existing DBs (errors silently ignored)
    await db.execAsync(`ALTER TABLE user_mood_entries ADD COLUMN emotionLabel TEXT;`).catch(() => {});
    await db.execAsync(`ALTER TABLE user_mood_entries ADD COLUMN emotionCore TEXT;`).catch(() => {});
    await db.execAsync(`ALTER TABLE user_mood_entries ADD COLUMN emotionEmoji TEXT;`).catch(() => {});

    // Performance indexes — safe to run multiple times (IF NOT EXISTS)
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_mood_user_date
        ON user_mood_entries(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_mood_user_created
        ON user_mood_entries(user_id, createdAt DESC);
    `);

    return db;
  } catch (err) {
    console.error("[DB] initDatabase failed:", err);
    throw err;
  }
}

export async function getEntries(userId: string): Promise<MoodEntry[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM user_mood_entries WHERE user_id = ? ORDER BY createdAt DESC",
      [userId],
    );
    return rows.map((row) => ({
      ...row,
      intensity: row.intensity ?? 5,
      tags: row.tags ? JSON.parse(row.tags) : [],
      emotionLabel: row.emotionLabel ?? undefined,
      emotionCore: row.emotionCore ?? undefined,
      emotionEmoji: row.emotionEmoji ?? undefined,
    }));
  } catch (err) {
    console.error("[DB] getEntries failed:", err);
    return [];
  }
}

export async function insertEntry(userId: string, entry: MoodEntry): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO user_mood_entries
         (id, user_id, date, time, mood, intensity, note, tags, createdAt, timeZone, emotionLabel, emotionCore, emotionEmoji)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        entry.timeZone ?? null,
        entry.emotionLabel ?? null,
        entry.emotionCore ?? null,
        entry.emotionEmoji ?? null,
      ],
    );
  } catch (err) {
    console.error("[DB] insertEntry failed:", err);
    throw err;
  }
}

/** Update mutable fields (note + tags) on an existing entry. */
export async function updateEntry(
  userId: string,
  id: string,
  updates: { note: string; tags: string[] },
): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `UPDATE user_mood_entries
         SET note = ?, tags = ?
       WHERE id = ? AND user_id = ?`,
      [updates.note, JSON.stringify(updates.tags), id, userId],
    );
  } catch (err) {
    console.error("[DB] updateEntry failed:", err);
    throw err;
  }
}

export async function removeEntry(userId: string, id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      "DELETE FROM user_mood_entries WHERE id = ? AND user_id = ?",
      [id, userId],
    );
  } catch (err) {
    console.error("[DB] removeEntry failed:", err);
    throw err;
  }
}

export async function clearAllEntries(userId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      "DELETE FROM user_mood_entries WHERE user_id = ?",
      [userId],
    );
  } catch (err) {
    console.error("[DB] clearAllEntries failed:", err);
    throw err;
  }
}
