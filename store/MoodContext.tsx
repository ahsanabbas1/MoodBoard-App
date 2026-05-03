import React, { createContext, useContext, useEffect, useState } from 'react';
import { MoodEntry, MoodLevel } from '../types';
import * as db from './database';
import { useAuth } from './AuthContext';
import { getMoodConfig } from '../constants/Moods';

interface MoodContextType {
  entries: MoodEntry[];
  addEntry: (mood: MoodLevel, intensity: number, note: string, tags: string[]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
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
  }, [user?.id]); // Reload when user logs in or out

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

  async function addEntry(mood: MoodLevel, intensity: number, note: string, tags: string[]) {
    if (!user?.id) return;
    const now = new Date();
    const newEntry: MoodEntry = {
      id: `entry_${Date.now()}`,
      date: now.toISOString().split('T')[0],
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

    // Sync current mood emoji to Supabase Profile for Family sharing
    try {
      const moodConfig = getMoodConfig(mood);
      await updateProfile({ currentMoodEmoji: moodConfig.emoji });
    } catch (e) {
      console.error('Failed to sync mood emoji to profile:', e);
    }
  }

  async function deleteEntry(id: string) {
    if (!user?.id) return;
    await db.removeEntry(user.id, id);
    const updated = await db.getEntries(user.id);
    setEntries(updated);
  }

  function getTodayEntry() {
    const today = new Date().toISOString().split('T')[0];
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
      const dateStr = d.toISOString().split('T')[0];
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
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const recent = entries.filter((e) => e.date >= cutoffStr);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, e) => sum + e.mood, 0) / recent.length;
  }

  return (
    <MoodContext.Provider
      value={{
        entries,
        addEntry,
        deleteEntry,
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
