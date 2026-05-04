import React, { createContext, useContext, useEffect, useState } from 'react';
import { MoodEntry, MoodLevel } from '../types';
import * as db from './database';
import { useAuth } from './AuthContext';
import { getMoodConfig } from '../constants/Moods';
import { toDateString } from '../utils/date';
import { invalidateInsightsCache } from '../services/aiInsightsService';

interface MoodContextType {
  entries: MoodEntry[];
  addEntry: (mood: MoodLevel, intensity: number, note: string, tags: string[]) => Promise<void>;
  editEntry: (id: string, note: string, tags: string[]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  getTodayEntry: () => MoodEntry | undefined;
  getEntriesForDate: (date: string) => MoodEntry[];
  getEntriesForDateRange: (start: string, end: string) => MoodEntry[];
  getStreak: () => number;
  getAverageMood: (days?: number) => number;
  isLoading: boolean;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, updateProfile } = useAuth();

  useEffect(() => {
    initAndLoad();
  }, [user?.id]);

  async function initAndLoad() {
    if (!user?.id) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      await db.initDatabase();
      const allEntries = await db.getEntries(user.id);
      setEntries(allEntries);
    } catch (error) {
      console.error('Failed to init/load moods:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /** Re-fetch all entries from SQLite (used by pull-to-refresh). */
  async function reload() {
    if (!user?.id) return;
    const allEntries = await db.getEntries(user.id);
    setEntries(allEntries);
  }

  async function addEntry(mood: MoodLevel, intensity: number, note: string, tags: string[]) {
    if (!user?.id) return;
    const now = new Date();
    const newEntry: MoodEntry = {
      id: `entry_${Date.now()}`,
      date: toDateString(now),
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      mood,
      intensity,
      note,
      tags,
      createdAt: now.getTime(),
    };

    await db.insertEntry(user.id, newEntry);
    const updated = await db.getEntries(user.id);
    setEntries(updated);

    // Invalidate AI insights cache so next open gets fresh analysis
    invalidateInsightsCache(user.id).catch(() => {});

    // Sync current mood emoji to Supabase profile for family/friends sharing
    try {
      const moodConfig = getMoodConfig(mood);
      await updateProfile({ currentMoodEmoji: moodConfig.emoji });
    } catch (e) {
      console.error('Failed to sync mood emoji to profile:', e);
    }
  }

  /** Update note and tags on an existing entry (mood level is immutable). */
  async function editEntry(id: string, note: string, tags: string[]) {
    if (!user?.id) return;
    await db.updateEntry(user.id, id, { note, tags });
    const updated = await db.getEntries(user.id);
    setEntries(updated);
    invalidateInsightsCache(user.id).catch(() => {});
  }

  async function deleteEntry(id: string) {
    if (!user?.id) return;
    await db.removeEntry(user.id, id);
    const updated = await db.getEntries(user.id);
    setEntries(updated);
    invalidateInsightsCache(user.id).catch(() => {});
  }

  function getTodayEntry() {
    const today = toDateString();
    return entries.find((e) => e.date === today);
  }

  function getEntriesForDate(date: string) {
    return entries.filter((e) => e.date === date);
  }

  function getEntriesForDateRange(start: string, end: string) {
    return entries.filter((e) => e.date >= start && e.date <= end);
  }

  function getStreak() {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toDateString(d);
      if (entries.some((e) => e.date === dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  function getAverageMood(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = toDateString(cutoff);
    const recent = entries.filter((e) => e.date >= cutoffStr);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, e) => sum + e.mood, 0) / recent.length;
  }

  return (
    <MoodContext.Provider
      value={{
        entries,
        addEntry,
        editEntry,
        deleteEntry,
        reload,
        getTodayEntry,
        getEntriesForDate,
        getEntriesForDateRange,
        getStreak,
        getAverageMood,
        isLoading,
      }}
    >
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const ctx = useContext(MoodContext);
  if (!ctx) throw new Error('useMood must be used within MoodProvider');
  return ctx;
}
