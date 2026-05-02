import { useMemo } from 'react';
import { useMood } from '../store/MoodContext';
import { MoodLevel } from '../types';
import { getMoodConfig } from '../constants/Moods';

export function useMoodStats() {
  const { entries, getStreak, getAverageMood } = useMood();

  const streak = useMemo(() => getStreak(), [entries, getStreak]);
  const avgMood = useMemo(() => getAverageMood(7), [entries, getAverageMood]);
  const avgConfig = useMemo(() => 
    avgMood > 0 ? getMoodConfig(Math.round(avgMood) as MoodLevel) : null,
  [avgMood]);

  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const entry = entries.find((e) => e.date === dateStr);
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
        mood: entry ? (entry.mood as MoodLevel) : null,
        isToday: i === 6,
      };
    });
  }, [entries]);

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);
  const totalEntries = entries.length;

  return {
    streak,
    avgMood,
    avgConfig,
    weekData,
    recentEntries,
    totalEntries,
  };
}
