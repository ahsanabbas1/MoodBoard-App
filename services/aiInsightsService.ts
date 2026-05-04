import AsyncStorage from "@react-native-async-storage/async-storage";
import { MoodEntry } from "../types";
import { toDateString } from "../utils/date";

const PROXY_URL =
  (process.env.EXPO_PUBLIC_AI_PROXY_URL ?? "https://your-proxy.vercel.app") +
  "/api/insights";

// Cache is per-user so it never leaks between accounts
const cacheKey = (uid: string) => `ai_insights_cache_${uid}`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 30_000;           // 30-second hard timeout

// ── Public types ─────────────────────────────────────────────────────────────

export type InsightCategory = "pattern" | "suggestion" | "achievement" | "warning";

export interface AIInsight {
  title: string;
  body: string;
  category: InsightCategory;
  emoji: string;
}

export interface InsightsResult {
  summary: string;
  insights: AIInsight[];
  generatedAt: number;
  fromCache: boolean;
}

interface CacheEntry {
  result: InsightsResult;
  entryCount: number;
}

// ── Main fetch ────────────────────────────────────────────────────────────────

/**
 * Fetches AI insights for the given mood entries.
 * Cache is user-scoped to prevent leaking between accounts on sign-out.
 * Falls back to cached data on network error — screen never breaks.
 */
export async function fetchAIInsights(
  entries: MoodEntry[],
  userId: string,
): Promise<InsightsResult | null> {
  if (entries.length === 0 || !userId) return null;

  const key = cacheKey(userId);

  // Cache hit — return early if fresh and entry count matches
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const cached: CacheEntry = JSON.parse(raw);
      const age = Date.now() - cached.result.generatedAt;
      if (age < CACHE_TTL_MS && cached.entryCount === entries.length) {
        return { ...cached.result, fromCache: true };
      }
    }
  } catch {}

  const payload = buildPayload(entries);

  // Fetch with 30-second timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`AI insights proxy ${res.status}`);
      return loadFromCache(key);
    }

    const result: InsightsResult = { ...(await res.json()), fromCache: false };
    const entry: CacheEntry = { result, entryCount: entries.length };
    await AsyncStorage.setItem(key, JSON.stringify(entry)).catch(() => {});
    return result;
  } catch (err: any) {
    clearTimeout(timer);
    const reason = err?.name === "AbortError" ? "timeout" : String(err);
    console.warn("AI insights fetch failed:", reason);
    return loadFromCache(key);
  }
}

/** Invalidate cache after the user logs a new entry or edits/deletes one. */
export async function invalidateInsightsCache(userId: string): Promise<void> {
  if (!userId) return;
  await AsyncStorage.removeItem(cacheKey(userId)).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadFromCache(key: string): Promise<InsightsResult | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cached: CacheEntry = JSON.parse(raw);
    return { ...cached.result, fromCache: true };
  } catch {
    return null;
  }
}

function buildPayload(entries: MoodEntry[]) {
  const latest100 = entries.slice(0, 100);

  const moodSum = latest100.reduce((s, e) => s + e.mood, 0);
  const averageMood = latest100.length > 0 ? moodSum / latest100.length : 0;

  const tagCounts: Record<string, number> = {};
  latest100.forEach((e) =>
    e.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }),
  );
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const moodTrend = computeTrend(latest100);
  const streak = computeStreak(latest100);

  const oldestDate = latest100[latest100.length - 1]?.date ?? latest100[0]?.date;
  const periodDays = oldestDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(oldestDate + "T12:00:00").getTime()) / 86_400_000))
    : 1;

  return {
    entries: latest100.map((e) => ({
      date: e.date,
      mood: e.mood,
      intensity: e.intensity,
      tags: e.tags,
      hasNote: e.note.trim().length > 0,
    })),
    stats: { totalEntries: latest100.length, averageMood, streak, topTags, moodTrend, periodDays },
  };
}

function computeTrend(entries: MoodEntry[]): "improving" | "declining" | "stable" {
  if (entries.length < 4) return "stable";
  const half = Math.floor(entries.length / 2);
  const recent = entries.slice(0, half).reduce((s, e) => s + e.mood, 0) / half;
  const older  = entries.slice(half).reduce((s, e) => s + e.mood, 0) / (entries.length - half);
  if (recent - older > 0.4) return "improving";
  if (older - recent > 0.4) return "declining";
  return "stable";
}

function computeStreak(entries: MoodEntry[]): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = toDateString(d);
    if (entries.some((e) => e.date === dateStr)) streak++;
    else break;
  }
  return streak;
}
