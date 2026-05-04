import AsyncStorage from "@react-native-async-storage/async-storage";
import { MoodEntry } from "../types";
import { MOODS } from "../constants/Moods";

// ---------------------------------------------------------------------------
// Replace with your deployed Vercel URL (or ngrok during development)
// ---------------------------------------------------------------------------
const PROXY_URL =
  (process.env.EXPO_PUBLIC_AI_PROXY_URL ?? "https://your-proxy.vercel.app") +
  "/api/insights";

// Cache key and TTL (6 hours — insights don't need to be real-time)
const CACHE_KEY = "ai_insights_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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
  entryCount: number; // invalidate if new entries were logged
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

/**
 * Fetches AI insights for the given mood entries.
 * Returns cached data if it's fresh and the entry count hasn't changed.
 * Falls back to cache on network error so the screen never breaks.
 */
export async function fetchAIInsights(entries: MoodEntry[]): Promise<InsightsResult | null> {
  if (entries.length === 0) return null;

  // --- Check cache ---
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: CacheEntry = JSON.parse(raw);
      const age = Date.now() - cached.result.generatedAt;
      const sameCount = cached.entryCount === entries.length;
      if (age < CACHE_TTL_MS && sameCount) {
        return { ...cached.result, fromCache: true };
      }
    }
  } catch {
    // cache miss — proceed to fetch
  }

  // --- Build payload ---
  const payload = buildPayload(entries);

  // --- Call proxy ---
  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`AI insights proxy returned ${res.status}:`, errBody);
      return await loadFromCache(); // graceful degradation
    }

    const result: InsightsResult = { ...(await res.json()), fromCache: false };

    // Persist to cache
    const cacheEntry: CacheEntry = { result, entryCount: entries.length };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry)).catch(() => {});

    return result;
  } catch (err) {
    console.warn("AI insights fetch failed, using cache:", err);
    return await loadFromCache();
  }
}

/** Force-invalidate cache (call after user logs a new mood entry). */
export async function invalidateInsightsCache() {
  await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadFromCache(): Promise<InsightsResult | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CacheEntry = JSON.parse(raw);
    return { ...cached.result, fromCache: true };
  } catch {
    return null;
  }
}

function buildPayload(entries: MoodEntry[]) {
  const latest100 = entries.slice(0, 100); // entries are DESC by createdAt

  // Derive stats
  const moodSum = latest100.reduce((s, e) => s + e.mood, 0);
  const averageMood = moodSum / latest100.length;

  const tagCounts: Record<string, number> = {};
  latest100.forEach(e => e.tags.forEach(t => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }));
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const moodTrend = computeTrend(latest100);
  const streak = computeStreak(latest100);

  const oldestDate = latest100[latest100.length - 1]?.date ?? latest100[0].date;
  const periodDays = Math.ceil(
    (Date.now() - new Date(oldestDate).getTime()) / 86_400_000
  ) || 1;

  return {
    entries: latest100.map(e => ({
      date: e.date,
      mood: e.mood,
      intensity: e.intensity,
      tags: e.tags,
      hasNote: e.note.trim().length > 0,
    })),
    stats: {
      totalEntries: latest100.length,
      averageMood,
      streak,
      topTags,
      moodTrend,
      periodDays,
    },
  };
}

function computeTrend(entries: MoodEntry[]): "improving" | "declining" | "stable" {
  if (entries.length < 4) return "stable";
  const half = Math.floor(entries.length / 2);
  // entries are DESC, so older entries are at the end
  const recent = entries.slice(0, half).reduce((s, e) => s + e.mood, 0) / half;
  const older = entries.slice(half).reduce((s, e) => s + e.mood, 0) / (entries.length - half);
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
    const dateStr = d.toISOString().split("T")[0];
    if (entries.some(e => e.date === dateStr)) streak++;
    else break;
  }
  return streak;
}
