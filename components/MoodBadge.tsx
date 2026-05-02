import { View, Text, StyleSheet } from 'react-native';
import { getMoodConfig } from '../constants/Moods';
import { MoodLevel } from '../types';

interface Props {
  mood: MoodLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function MoodBadge({ mood, size = 'md', showLabel = false }: Props) {
  const config = getMoodConfig(mood);
  const emojiSize = size === 'sm' ? 20 : size === 'md' ? 28 : 40;
  const containerSize = size === 'sm' ? 36 : size === 'md' ? 48 : 64;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.circle,
          { width: containerSize, height: containerSize, backgroundColor: config.bgColor },
        ]}
      >
        <Text style={{ fontSize: emojiSize }}>{config.emoji}</Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
