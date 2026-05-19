import { MoodConfig, MoodLevel } from '../types';

export const MOODS: MoodConfig[] = [
  {
    level: 6,
    label: 'Amazing',
    emoji: '🤩',
    color: '#10B981',
    bgColor: '#ECFDF5',
    gradientColors: ['#10B981', '#34D399'],
  },
  {
    level: 5,
    label: 'Happy',
    emoji: '😄',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    gradientColors: ['#3B82F6', '#60A5FA'],
  },
  {
    level: 4,
    label: 'Good',
    emoji: '😊',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    gradientColors: ['#8B5CF6', '#A78BFA'],
  },
  {
    level: 3,
    label: 'Neutral',
    emoji: '😐',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    gradientColors: ['#F59E0B', '#FCD34D'],
  },
  {
    level: 2,
    label: 'Sad',
    emoji: '😔',
    color: '#F97316',
    bgColor: '#FFF7ED',
    gradientColors: ['#F97316', '#FB923C'],
  },
  {
    level: 1,
    label: 'Very Sad',
    emoji: '😢',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    gradientColors: ['#EF4444', '#F87171'],
  },
];

export const getMoodConfig = (level: MoodLevel): MoodConfig =>
  MOODS.find((m) => m.level === level) ?? MOODS[2];

/** Legacy flat list — kept for backward compat (entry detail editing). */
export const TAGS = [
  'Work', 'Family', 'Friends', 'Health', 'Exercise',
  'Sleep', 'Food', 'Weather', 'Anxiety', 'Grateful',
  'Tired', 'Productive', 'Social', 'Creative', 'Relaxed',
];

export interface TagCategory {
  category: string;
  icon: string;
  tags: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    category: 'Work & Focus',
    icon: '💼',
    tags: ['Work', 'Productive', 'Meeting', 'Deadline', 'Achievement', 'Study', 'Creative', 'Focus'],
  },
  {
    category: 'Relationships',
    icon: '👥',
    tags: ['Family', 'Friends', 'Partner', 'Social', 'Conflict', 'Support', 'Lonely', 'Community'],
  },
  {
    category: 'Physical',
    icon: '💪',
    tags: ['Exercise', 'Sleep', 'Food', 'Health', 'Energy', 'Sick', 'Tired', 'Rest'],
  },
  {
    category: 'Mental',
    icon: '🧠',
    tags: ['Anxiety', 'Stress', 'Grateful', 'Mindful', 'Relaxed', 'Overwhelmed', 'Calm', 'Hopeful'],
  },
  {
    category: 'Environment',
    icon: '🌤',
    tags: ['Weather', 'Home', 'Travel', 'Nature', 'Noise', 'Music', 'City', 'Outdoors'],
  },
  {
    category: 'Events',
    icon: '🎉',
    tags: ['Party', 'Shopping', 'Reading', 'Movie', 'Gaming', 'Celebration', 'Routine', 'Spontaneous'],
  },
];
