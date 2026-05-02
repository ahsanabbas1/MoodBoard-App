import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { getMoodConfig } from '../constants/Moods';
import { MoodLevel } from '../types';

interface DayData {
  day: string;
  mood: MoodLevel | null;
  isToday?: boolean;
}

interface Props {
  data: DayData[];
}

export default function WeekMoodChart({ data }: Props) {
  const maxHeight = 80;

  return (
    <View style={styles.container}>
      {data.map((item, idx) => {
        const config = item.mood ? getMoodConfig(item.mood) : null;
        const barHeight = item.mood ? (item.mood / 5) * maxHeight : 0;

        return (
          <View key={idx} style={styles.dayCol}>
            {item.mood ? (
              <>
                <Text style={styles.emoji}>{config!.emoji}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: barHeight, backgroundColor: config!.color },
                    ]}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.emojiEmpty}>·</Text>
                <View style={styles.barTrack}>
                  <View style={styles.emptyBar} />
                </View>
              </>
            )}
            <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday]}>
              {item.day}
            </Text>
            {item.isToday && <View style={styles.todayDot} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    gap: 4,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 18,
  },
  emojiEmpty: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  barTrack: {
    width: 28,
    height: 80,
    backgroundColor: Colors.border,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 8,
  },
  emptyBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 8,
  },
  dayLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dayLabelToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
