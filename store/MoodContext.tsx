import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodEntry, MoodLevel } from '../types';
import * as db from './database';

const STORAGE_KEY = '@moodboard_entries';
const MIGRATION_KEY = '@moodboard_migrated_to_sqlite';

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

function generateMockEntries(): MoodEntry[] {
  const entries: MoodEntry[] = [];
  const moods: MoodLevel[] = [6, 5, 4, 3, 6, 5, 3, 2, 5, 6, 3, 4, 6, 5, 3, 6, 4, 5, 3, 6, 5, 2, 3, 4, 6, 5, 3, 4, 6, 5];
  const notes = [
    'Had a great morning workout!',
    'Productive day at work.',
    'Feeling a bit tired but okay.',
    "Didn't sleep well last night.",
    'Spent quality time with family.',
    'Finished a big project!',
    'Just an average day.',
    'Stressed about deadlines.',
    'Good lunch with friends.',
    'Feeling grateful today.',
    '',
    'Went for a long walk.',
    'Amazing sunset today!',
    'Read a great book.',
    '',
    'Cooked a new recipe.',
    'Caught up with old friends.',
    'Feeling energetic!',
    'A bit under the weather.',
    'Meditation helped a lot.',
    'Great team meeting.',
    'Overwhelmed with tasks.',
    'Took a rest day.',
    'Enjoyed a quiet evening.',
    'Birthday celebration!',
    'Tried a new coffee shop.',
    'Cloudy day, feeling meh.',
    'Exercise boosted my mood.',
    'Grateful for good health.',
    'Looking forward to the weekend.',
  ];
  const tagSets = [
    ['Exercise', 'Health'], ['Work', 'Productive'], ['Tired', 'Sleep'],
    ['Sleep'], ['Family', 'Grateful'], ['Work', 'Productive'],
    [], ['Work', 'Anxiety'], ['Friends', 'Food'], ['Grateful'],
    [], ['Exercise', 'Health'], ['Weather', 'Grateful'], ['Relaxed', 'Creative'],
    [], ['Food', 'Creative'], ['Friends', 'Social'], ['Exercise', 'Health'],
    ['Health'], ['Relaxed'], ['Work'], ['Work', 'Anxiety', 'Tired'],
    ['Health', 'Relaxed'], ['Relaxed'], ['Friends', 'Social', 'Family'],
    ['Food', 'Social'], ['Weather'], ['Exercise', 'Health'],
    ['Health', 'Grateful'], ['Work', 'Productive'],
  ];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const idx = 29 - i;

    if (i === 0) continue; // no entry for today yet

    entries.push({
      id: `mock_${idx}`,
      date: dateStr,
      time: `${8 + Math.floor(Math.random() * 4)}:${Math.random() > 0.5 ? '00' : '30'}`,
      mood: moods[idx] as MoodLevel ?? 3,
      intensity: 5 + Math.floor(Math.random() * 5),
      note: notes[idx] ?? '',
      tags: tagSets[idx] ?? [],
      createdAt: date.getTime(),
    });
  }

  return entries;
}

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (!isInitializing.current) {
      initAndLoad();
    }
  }, []);

  async function initAndLoad() {
    if (isInitializing.current) return;
    isInitializing.current = true;
    
    try {
      await db.initDatabase();
      
      // Check if we need to migrate from AsyncStorage
      const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
      if (!migrated) {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const oldEntries: MoodEntry[] = JSON.parse(stored);
            await db.insertEntries(oldEntries);
          } catch (e) {
            console.error('Migration failed:', e);
          }
        } else {
          // If no old data, seed with mocks
          const mock = generateMockEntries();
          await db.insertEntries(mock);
        }
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      }

      const allEntries = await db.getEntries();
      setEntries(allEntries);
    } catch (error) {
      console.error('Failed to init/load moods:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function addEntry(mood: MoodLevel, intensity: number, note: string, tags: string[]) {
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
    
    await db.insertEntry(newEntry);
    const updated = await db.getEntries();
    setEntries(updated);
  }

  async function deleteEntry(id: string) {
    await db.removeEntry(id);
    const updated = await db.getEntries();
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
