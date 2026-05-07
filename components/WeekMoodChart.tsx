import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { getMoodConfig } from '../constants/Moods';
import { MoodLevel } from '../types';
import AnimatedEmoji from './AnimatedEmoji';

interface DayData {
  day: string;
  date?: number;
  month?: string;
  mood: MoodLevel | null;
  isToday?: boolean;
  isFuture?: boolean;
}

interface Props {
  data: DayData[];
  monthLabel?: string;
}

export default function WeekMoodChart({ data, monthLabel }: Props) {
  const maxHeight = 80;

  return (
    <View>
      {monthLabel ? (
        <Text style={styles.monthLabel}>{monthLabel}</Text>
      ) : null}
      <View style={styles.container}>
        {data.map((item, idx) => {
          const config = item.mood && !item.isFuture ? getMoodConfig(item.mood) : null;
          const barHeight = item.mood && !item.isFuture ? (item.mood / 6) * maxHeight : 0;

          return (
            <View key={idx} style={styles.dayCol}>
              {config ? (
                <>
                  <AnimatedEmoji emoji={config.emoji} type="bounceIn" delay={idx * 60} style={styles.emoji} />
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: barHeight, backgroundColor: config.color }]} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.emojiEmpty, item.isFuture && styles.futurePlaceholder]}>
                    {item.isFuture ? '·' : '·'}
                  </Text>
                  <View style={[styles.barTrack, item.isFuture && styles.barTrackFuture]}>
                    <View style={styles.emptyBar} />
                  </View>
                </>
              )}
              <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday, item.isFuture && styles.dayLabelFuture]}>
                {item.day}
              </Text>
              {item.date !== undefined && (
                <Text style={[styles.dateLabel, item.isToday && styles.dateLabelToday, item.isFuture && styles.dayLabelFuture]}>
                  {item.date}
                </Text>
              )}
              {item.isToday && <View style={styles.todayDot} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
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
  emoji: { fontSize: 18 },
  emojiEmpty: { fontSize: 18, color: Colors.textMuted },
  futurePlaceholder: { color: Colors.border },
  barTrack: {
    width: 28,
    height: 80,
    backgroundColor: Colors.border,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barTrackFuture: { opacity: 0.4 },
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
  dayLabelFuture: { color: Colors.border },
  dateLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  dateLabelToday: {
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
