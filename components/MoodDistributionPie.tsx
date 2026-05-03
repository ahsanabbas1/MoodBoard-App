import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { MOODS } from '../constants/Moods';
import { Colors } from '../constants/Colors';
import { MoodEntry } from '../types';

interface Props {
  entries: MoodEntry[];
}

const SIZE = 140;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;

export default function MoodDistributionPie({ entries }: Props) {
  const total = entries.length;
  if (total === 0) return null;

  const counts = MOODS.map((m) => {
    const count = entries.filter((e) => e.mood === m.level).length;
    return { ...m, count, pct: count / total };
  });

  // Build donut segments — track cumulative rotation offset
  let offset = 0;
  const segments = counts
    .filter((m) => m.count > 0)
    .map((m) => {
      const dash = m.pct * CIRCUMFERENCE;
      const gap = CIRCUMFERENCE - dash;
      const rotation = offset * 360 - 90; // start from top
      offset += m.pct;
      return { ...m, dash, gap, rotation };
    });

  return (
    <View style={styles.container}>
      {/* Legend — left side */}
      <View style={styles.legend}>
        {counts.map((m) => (
          <View key={m.level} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: m.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {m.emoji} {m.label}
            </Text>
            <Text style={[styles.legendPct, { color: m.color }]}>
              {m.count > 0 ? `${Math.round(m.pct * 100)}%` : '0%'}
            </Text>
          </View>
        ))}
      </View>

      {/* Donut chart — right side */}
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE}>
          {/* Background ring */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={Colors.border}
            strokeWidth={STROKE}
          />
          <G>
            {segments.map((seg) => (
              <Circle
                key={seg.level}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${seg.dash} ${seg.gap}`}
                strokeDashoffset={0}
                strokeLinecap="butt"
                transform={`rotate(${seg.rotation}, ${CENTER}, ${CENTER})`}
              />
            ))}
          </G>
        </Svg>
        {/* Center label */}
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerCount}>{total}</Text>
          <Text style={styles.centerSub}>entries</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerCount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  centerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
