import { MoodLevel } from '../types';

export interface TertiaryEmotion {
  label: string;
  emoji: string;
}

export interface SecondaryEmotion {
  label: string;
  emoji: string;
  children: [TertiaryEmotion, TertiaryEmotion];
}

export interface CoreEmotion {
  label: string;
  color: string;
  secColor: string;
  terColor: string;
  textColor: string;
  emoji: string;
  secondary: SecondaryEmotion[];
}

export interface EmotionSelection {
  label: string;
  core: string;
  emoji: string;
}

export const EMOTION_WHEEL: CoreEmotion[] = [
  {
    label: 'Happy',
    color: '#F5C518',
    secColor: '#F9DC64',
    terColor: '#FBE98D',
    textColor: '#78350F',
    emoji: '😊',
    secondary: [
      { label: 'Joyful', emoji: '😄', children: [{ label: 'Playful', emoji: '🤸' }, { label: 'Excited', emoji: '🎉' }] },
      { label: 'Content', emoji: '😌', children: [{ label: 'Peaceful', emoji: '🕊️' }, { label: 'Satisfied', emoji: '😏' }] },
      { label: 'Interested', emoji: '🤔', children: [{ label: 'Curious', emoji: '🔍' }, { label: 'Inquisitive', emoji: '🧐' }] },
      { label: 'Proud', emoji: '🦁', children: [{ label: 'Successful', emoji: '🏆' }, { label: 'Confident', emoji: '💪' }] },
      { label: 'Accepted', emoji: '🤝', children: [{ label: 'Respected', emoji: '👑' }, { label: 'Valued', emoji: '💎' }] },
      { label: 'Powerful', emoji: '⚡', children: [{ label: 'Courageous', emoji: '🦸' }, { label: 'Creative', emoji: '🎨' }] },
      { label: 'Peaceful', emoji: '☮️', children: [{ label: 'Loving', emoji: '❤️' }, { label: 'Thankful', emoji: '🙏' }] },
      { label: 'Trusting', emoji: '🤗', children: [{ label: 'Sensitive', emoji: '🌸' }, { label: 'Intimate', emoji: '💑' }] },
      { label: 'Optimistic', emoji: '🌟', children: [{ label: 'Hopeful', emoji: '🌈' }, { label: 'Inspired', emoji: '✨' }] },
    ],
  },
  {
    label: 'Surprised',
    color: '#A78BFA',
    secColor: '#C4B0FB',
    terColor: '#D9D0FD',
    textColor: '#4C1D95',
    emoji: '😲',
    secondary: [
      { label: 'Startled', emoji: '😱', children: [{ label: 'Shocked', emoji: '😨' }, { label: 'Dismayed', emoji: '😦' }] },
      { label: 'Confused', emoji: '😕', children: [{ label: 'Disillusioned', emoji: '😶' }, { label: 'Perplexed', emoji: '🤨' }] },
      { label: 'Amazed', emoji: '🤩', children: [{ label: 'Astonished', emoji: '😮' }, { label: 'Awe', emoji: '🤯' }] },
      { label: 'Excited', emoji: '🎊', children: [{ label: 'Eager', emoji: '🙌' }, { label: 'Energetic', emoji: '⚡' }] },
      { label: 'Playful', emoji: '🎭', children: [{ label: 'Aroused', emoji: '🔥' }, { label: 'Cheeky', emoji: '😜' }] },
    ],
  },
  {
    label: 'Bad',
    color: '#34D399',
    secColor: '#6EE7B7',
    terColor: '#A7F3D0',
    textColor: '#064E3B',
    emoji: '😞',
    secondary: [
      { label: 'Bored', emoji: '😑', children: [{ label: 'Indifferent', emoji: '😐' }, { label: 'Apathetic', emoji: '🥱' }] },
      { label: 'Busy', emoji: '😤', children: [{ label: 'Pressured', emoji: '😰' }, { label: 'Rushed', emoji: '🏃' }] },
      { label: 'Stressed', emoji: '😫', children: [{ label: 'Overwhelmed', emoji: '🌊' }, { label: 'Out of control', emoji: '🌀' }] },
      { label: 'Tired', emoji: '😴', children: [{ label: 'Sleepy', emoji: '💤' }, { label: 'Unfocussed', emoji: '🌫️' }] },
    ],
  },
  {
    label: 'Fearful',
    color: '#FCD34D',
    secColor: '#FDE07B',
    terColor: '#FEE9A0',
    textColor: '#78350F',
    emoji: '😨',
    secondary: [
      { label: 'Scared', emoji: '😱', children: [{ label: 'Helpless', emoji: '🆘' }, { label: 'Frightened', emoji: '👻' }] },
      { label: 'Anxious', emoji: '😟', children: [{ label: 'Overwhelmed', emoji: '😩' }, { label: 'Worried', emoji: '😧' }] },
      { label: 'Insecure', emoji: '🙈', children: [{ label: 'Inadequate', emoji: '😔' }, { label: 'Inferior', emoji: '⬇️' }] },
      { label: 'Weak', emoji: '😪', children: [{ label: 'Worthless', emoji: '💔' }, { label: 'Insignificant', emoji: '🌑' }] },
      { label: 'Rejected', emoji: '🚫', children: [{ label: 'Excluded', emoji: '😶' }, { label: 'Persecuted', emoji: '😤' }] },
      { label: 'Threatened', emoji: '⚠️', children: [{ label: 'Nervous', emoji: '😬' }, { label: 'Exposed', emoji: '🫣' }] },
    ],
  },
  {
    label: 'Angry',
    color: '#EF4444',
    secColor: '#F87171',
    terColor: '#FCA5A5',
    textColor: '#7F1D1D',
    emoji: '😠',
    secondary: [
      { label: 'Let down', emoji: '😞', children: [{ label: 'Betrayed', emoji: '🗡️' }, { label: 'Resentful', emoji: '😒' }] },
      { label: 'Humiliated', emoji: '😳', children: [{ label: 'Disrespected', emoji: '👊' }, { label: 'Ridiculed', emoji: '🤭' }] },
      { label: 'Bitter', emoji: '😤', children: [{ label: 'Indignant', emoji: '😠' }, { label: 'Violated', emoji: '💢' }] },
      { label: 'Mad', emoji: '🤬', children: [{ label: 'Furious', emoji: '🔥' }, { label: 'Jealous', emoji: '💚' }] },
      { label: 'Aggressive', emoji: '👿', children: [{ label: 'Provoked', emoji: '⚡' }, { label: 'Hostile', emoji: '🗯️' }] },
      { label: 'Frustrated', emoji: '😣', children: [{ label: 'Infuriated', emoji: '😡' }, { label: 'Annoyed', emoji: '😒' }] },
      { label: 'Distant', emoji: '🧊', children: [{ label: 'Withdrawn', emoji: '🚪' }, { label: 'Numb', emoji: '😶' }] },
      { label: 'Critical', emoji: '🔍', children: [{ label: 'Sceptical', emoji: '🤨' }, { label: 'Dismissive', emoji: '🙄' }] },
    ],
  },
  {
    label: 'Disgusted',
    color: '#9CA3AF',
    secColor: '#C4C9D0',
    terColor: '#D9DDE2',
    textColor: '#1F2937',
    emoji: '🤢',
    secondary: [
      { label: 'Disapproving', emoji: '👎', children: [{ label: 'Judgmental', emoji: '⚖️' }, { label: 'Embarrassed', emoji: '😳' }] },
      { label: 'Disappointed', emoji: '😞', children: [{ label: 'Appalled', emoji: '😱' }, { label: 'Revolted', emoji: '🤮' }] },
      { label: 'Awful', emoji: '😖', children: [{ label: 'Nauseated', emoji: '🤢' }, { label: 'Detestable', emoji: '💀' }] },
      { label: 'Repelled', emoji: '🫣', children: [{ label: 'Horrified', emoji: '😨' }, { label: 'Hesitant', emoji: '🤐' }] },
    ],
  },
  {
    label: 'Sad',
    color: '#60A5FA',
    secColor: '#93C5FD',
    terColor: '#BFDBFE',
    textColor: '#1E3A5F',
    emoji: '😢',
    secondary: [
      { label: 'Lonely', emoji: '🌑', children: [{ label: 'Isolated', emoji: '🏝️' }, { label: 'Abandoned', emoji: '😿' }] },
      { label: 'Vulnerable', emoji: '🌧️', children: [{ label: 'Victimised', emoji: '😭' }, { label: 'Fragile', emoji: '🫧' }] },
      { label: 'Despair', emoji: '🌊', children: [{ label: 'Grief', emoji: '💔' }, { label: 'Powerless', emoji: '⛓️' }] },
      { label: 'Guilty', emoji: '😔', children: [{ label: 'Ashamed', emoji: '🙈' }, { label: 'Remorseful', emoji: '🥺' }] },
      { label: 'Depressed', emoji: '💤', children: [{ label: 'Empty', emoji: '⬛' }, { label: 'Inferior', emoji: '⬇️' }] },
      { label: 'Hurt', emoji: '😢', children: [{ label: 'Disappointed', emoji: '😞' }, { label: 'Embarrassed', emoji: '😳' }] },
    ],
  },
];

// Total secondary count (drives proportional core slice sizing)
export const TOTAL_SECONDARY = EMOTION_WHEEL.reduce(
  (sum, c) => sum + c.secondary.length,
  0,
);

// Map core label → MoodLevel for backward compat with existing dashboard/stats
export const CORE_TO_MOOD_LEVEL: Record<string, MoodLevel> = {
  Happy: 6,
  Surprised: 5,
  Bad: 3,
  Fearful: 2,
  Angry: 1,
  Disgusted: 2,
  Sad: 2,
};

// Map core label → hex color (for dashboard bar coloring)
export const CORE_TO_COLOR: Record<string, string> = {
  Happy: '#F5C518',
  Surprised: '#A78BFA',
  Bad: '#34D399',
  Fearful: '#FCD34D',
  Angry: '#EF4444',
  Disgusted: '#9CA3AF',
  Sad: '#60A5FA',
};
