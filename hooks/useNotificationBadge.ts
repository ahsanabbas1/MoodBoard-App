import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMood } from '../store/MoodContext';
import { toDateString } from '../utils/date';

const SK_NOTIFS = 'notifications_v1';

interface StoredState {
  id: string;
  read: boolean;
}

/**
 * Returns the live unread notification count for the bell badge.
 * Uses the same ID generation logic as the notifications screen so the
 * count is always consistent with what the user sees when they open it.
 */
export function useNotificationBadge(): number {
  const { entries, getStreak } = useMood();
  const streak = getStreak();

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load stored read-states once
  useEffect(() => {
    AsyncStorage.getItem(SK_NOTIFS)
      .then((raw) => {
        if (!raw) return;
        const stored: StoredState[] = JSON.parse(raw);
        setReadIds(new Set(stored.filter((s) => s.read).map((s) => s.id)));
      })
      .catch(() => {});
  }, []);

  // Re-read whenever the user navigates back to the dashboard (focus)
  // by watching entries — any new log will cause a re-render
  const unread = useMemo(() => {
    const today = toDateString();
    const ids: string[] = [];

    // Daily reminder
    if (!entries.some((e) => e.date === today)) {
      ids.push('auto-daily');
    }

    // Streak milestone
    if (streak >= 3) {
      ids.push(`auto-streak-${streak}`);
    }

    // Gap warning
    const dates = [...new Set(entries.map((e) => e.date))].sort().reverse();
    const lastDate = dates[0];
    if (lastDate) {
      const daysMissed = Math.floor(
        (Date.now() - new Date(lastDate + 'T12:00:00').getTime()) / 86_400_000,
      );
      if (daysMissed >= 3) ids.push(`auto-gap-${lastDate}`);
    }

    // Weekly digest
    if (entries.length >= 7) ids.push('auto-weekly-digest');

    // Milestones
    for (const m of [10, 25, 50, 100, 200]) {
      if (entries.length >= m) ids.push(`auto-milestone-${m}`);
    }

    // Insight
    if (entries.length >= 14) ids.push('auto-best-day');

    return ids.filter((id) => !readIds.has(id)).length;
  }, [entries, streak, readIds]);

  return unread;
}
