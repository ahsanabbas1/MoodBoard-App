import { View, Text, StyleSheet } from 'react-native';
import { MOODS } from '../constants/Moods';
import { Colors } from '../constants/Colors';
import { MoodEntry } from '../types';
import { MoodLevel } from '../types';

interface Props {
  entries: MoodEntry[];
}

export default function MoodDistributionBar({ entries }: Props) {
  const total = entries.length;
  if (total === 0) return null;

  const counts = MOODS.map((m) => ({
    ...m,
    count: entries.filter((e) => e.mood === m.level).length,
    pct: (entries.filter((e) => e.mood === m.level).length / total) * 100,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {counts.map((m) =>
          m.pct > 0 ? (
            <View
              key={m.level}
              style={[styles.segment, { flex: m.pct, backgroundColor: m.color }]}
            />
          ) : null
        )}
      </View>
      <View style={styles.legend}>
        {counts.map((m) => (
          <View key={m.level} style={styles.legendItem}>
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={styles.legendLabel}>{m.label}</Text>
            <Text style={[styles.legendCount, { color: m.color }]}>{m.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  bar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    gap: 2,
  },
  segment: {
    borderRadius: 999,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    alignItems: 'center',
    gap: 2,
  },
  emoji: { fontSize: 18 },
  legendLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  legendCount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
