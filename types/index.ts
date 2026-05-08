export type MoodLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface MoodEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM
  mood: MoodLevel;
  intensity: number; // 0-10
  note: string;
  tags: string[];
  createdAt: number; // timestamp
  timeZone?: string; // IANA timezone used when the entry was logged
}

export interface MoodConfig {
  level: MoodLevel;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  gradientColors: [string, string];
}

export interface WeekStat {
  day: string;
  shortDay: string;
  date: string;
  mood: MoodLevel | null;
}

export interface InsightStat {
  label: string;
  value: string | number;
  subtitle?: string;
}
