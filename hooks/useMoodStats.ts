import { useMemo } from "react";
import { useMood } from "../store/MoodContext";
import { MoodLevel } from "../types";
import { getMoodConfig } from "../constants/Moods";
import { toDateString } from "../utils/date";

export function useMoodStats(weekOffset = 0) {
  const { entries, getStreak, getAverageMood } = useMood();

  const streak = useMemo(() => getStreak(), [entries, getStreak]);
  const avgMood = useMemo(() => getAverageMood(7), [entries, getAverageMood]);
  const avgConfig = useMemo(
    () =>
      avgMood > 0 ? getMoodConfig(Math.round(avgMood) as MoodLevel) : null,
    [avgMood],
  );

  // weekOffset=0 is current week, weekOffset=-1 is last week, etc.
  const weekData = useMemo(() => {
    const today = new Date();
    // The "anchor" day is the last day of the viewed week
    // weekOffset=0 → anchor is today; weekOffset=-1 → anchor is 7 days ago
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + weekOffset * 7 - (6 - i));
      const dateStr = toDateString(d);
      const entry = entries.find((e) => e.date === dateStr);
      const isAnchorDay = i === 6 && weekOffset === 0;
      return {
        day: d
          .toLocaleDateString("en-US", {
            weekday: "short",
          })
          .slice(0, 1),
        date: d.getDate(),
        month: d.toLocaleDateString("en-US", {
          month: "short",
        }),
        fullDate: dateStr,
        mood: entry ? (entry.mood as MoodLevel) : null,
        isToday: toDateString(d) === toDateString(today),
        isFuture: d > today,
      };
    });
  }, [entries, weekOffset]);

  // Month label for the week header
  const weekMonthLabel = useMemo(() => {
    if (weekData.length === 0) return "";
    const first = weekData[0];
    const last = weekData[6];
    if (first.month === last.month) {
      return `${first.month} ${weekData[0].date}–${last.date}`;
    }
    return `${first.month} ${first.date} – ${last.month} ${last.date}`;
  }, [weekData]);

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);
  const totalEntries = entries.length;

  return {
    streak,
    avgMood,
    avgConfig,
    weekData,
    weekMonthLabel,
    recentEntries,
    totalEntries,
  };
}
