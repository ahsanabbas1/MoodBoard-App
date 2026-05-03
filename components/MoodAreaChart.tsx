import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useState } from 'react';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  G,
  Text as SvgText,
  Line,
} from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { getMoodConfig } from '../constants/Moods';
import { MoodEntry, MoodLevel } from '../types';

type Period = 'overview' | 'weekly' | 'monthly' | 'yearly';

const TABS: { key: Period; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const CHART_H = 160;
const PAD_X = 20;
const PAD_TOP = 16;
const PAD_BOTTOM = 28; // space for x-axis labels inside SVG
const PLOT_H = CHART_H - PAD_TOP - PAD_BOTTOM;
const MIN_MOOD = 1;
const MAX_MOOD = 6;

interface DataPoint {
  label: string;
  avg: number | null;
}

interface PlotPoint {
  x: number;
  y: number;
  label: string;
  avg: number;
  config: ReturnType<typeof getMoodConfig>;
  dataIndex: number;
}

interface Props {
  entries: MoodEntry[];
}

function moodToY(value: number): number {
  return PAD_TOP + PLOT_H - ((value - MIN_MOOD) / (MAX_MOOD - MIN_MOOD)) * PLOT_H;
}

function getData(entries: MoodEntry[], period: Period): DataPoint[] {
  const now = new Date();

  if (period === 'weekly') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const day = entries.filter((e) => e.date === dateStr);
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
        avg: day.length ? day.reduce((s, e) => s + e.mood, 0) / day.length : null,
      };
    });
  }

  if (period === 'monthly') {
    return Array.from({ length: 4 }, (_, wi) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - wi * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const wEntries = entries.filter(
        (e) =>
          e.date >= weekStart.toISOString().split('T')[0] &&
          e.date <= weekEnd.toISOString().split('T')[0]
      );
      return {
        label: `W${4 - wi}`,
        avg: wEntries.length
          ? wEntries.reduce((s, e) => s + e.mood, 0) / wEntries.length
          : null,
      };
    }).reverse();
  }

  if (period === 'yearly') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mEntries = entries.filter((e) => e.date.startsWith(monthStr));
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        avg: mEntries.length
          ? mEntries.reduce((s, e) => s + e.mood, 0) / mEntries.length
          : null,
      };
    });
  }

  // Overview: monthly buckets from first entry, max 12 months back
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Date(sorted[0].date + 'T12:00:00');
  const buckets: DataPoint[] = [];
  let cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  while (cur <= now) {
    const monthStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    const mEntries = entries.filter((e) => e.date.startsWith(monthStr));
    buckets.push({
      label: cur.toLocaleDateString('en-US', { month: 'short' }),
      avg: mEntries.length
        ? mEntries.reduce((s, e) => s + e.mood, 0) / mEntries.length
        : null,
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return buckets.slice(-12);
}

function buildSegments(pts: PlotPoint[]): { x: number; y: number }[][] {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  // pts are already only non-null values but gaps in data index break segments
  // Here all pts are valid — just one continuous segment
  pts.forEach((p) => cur.push({ x: p.x, y: p.y }));
  if (cur.length) segs.push(cur);
  return segs;
}

function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

function areaPath(pts: { x: number; y: number }[], bottomY: number): string {
  if (pts.length < 2) return '';
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return `${line} L${pts[pts.length - 1].x},${bottomY} L${pts[0].x},${bottomY} Z`;
}

export default function MoodAreaChart({ entries }: Props) {
  const [period, setPeriod] = useState<Period>('weekly');
  const [chartWidth, setChartWidth] = useState(320);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const data = getData(entries, period);
  const n = data.length;
  const plotW = chartWidth - PAD_X * 2;
  const bottomY = PAD_TOP + PLOT_H;

  const plotPoints: PlotPoint[] = data
    .map((d, i) => {
      if (d.avg === null) return null;
      const x = n > 1 ? PAD_X + (i / (n - 1)) * plotW : PAD_X + plotW / 2;
      const y = moodToY(d.avg);
      const level = Math.max(MIN_MOOD, Math.min(MAX_MOOD, Math.round(d.avg))) as MoodLevel;
      return { x, y, label: d.label, avg: d.avg, config: getMoodConfig(level), dataIndex: i };
    })
    .filter(Boolean) as PlotPoint[];

  const segments = buildSegments(plotPoints);
  const selected = selectedIdx !== null ? plotPoints.find((p) => p.dataIndex === selectedIdx) ?? null : null;

  // Use primary color for the chart line/fill
  const lineColor = Colors.primary;

  function xForIndex(i: number) {
    return n > 1 ? PAD_X + (i / (n - 1)) * plotW : PAD_X + plotW / 2;
  }

  return (
    <View style={styles.root}>
      {/* Period tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, period === t.key && styles.tabActive]}
            onPress={() => {
              setPeriod(t.key);
              setSelectedIdx(null);
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, period === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart container */}
      <View
        style={styles.chartWrap}
        onLayout={(e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width)}
      >
        {plotPoints.length < 2 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Not enough data for this period</Text>
          </View>
        ) : (
          <View style={{ position: 'relative' }}>
            <Svg width={chartWidth} height={CHART_H}>
              <Defs>
                <SvgGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
                  <Stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
                </SvgGradient>
              </Defs>

              {/* Horizontal grid lines at each mood level */}
              {[2, 3, 4, 5, 6].map((lvl) => {
                const gy = moodToY(lvl);
                return (
                  <Line
                    key={lvl}
                    x1={PAD_X}
                    y1={gy}
                    x2={chartWidth - PAD_X}
                    y2={gy}
                    stroke={Colors.border}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                );
              })}

              {/* Area fill */}
              {segments.map((seg, si) => (
                <Path
                  key={`area-${si}`}
                  d={areaPath(seg, bottomY)}
                  fill="url(#moodAreaGrad)"
                />
              ))}

              {/* Line */}
              {segments.map((seg, si) => (
                <Path
                  key={`line-${si}`}
                  d={linePath(seg)}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {/* Dots + hit areas */}
              {plotPoints.map((p) => {
                const isSel = selectedIdx === p.dataIndex;
                return (
                  <G
                    key={`dot-${p.dataIndex}`}
                    onPress={() => setSelectedIdx(isSel ? null : p.dataIndex)}
                  >
                    {/* Large invisible hit area */}
                    <Circle cx={p.x} cy={p.y} r={16} fill="transparent" />
                    {/* Outer ring when selected */}
                    {isSel && (
                      <Circle
                        cx={p.x}
                        cy={p.y}
                        r={10}
                        fill={p.config.color}
                        fillOpacity={0.2}
                      />
                    )}
                    {/* Dot */}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={isSel ? 6 : 4}
                      fill={isSel ? p.config.color : Colors.card}
                      stroke={isSel ? p.config.color : lineColor}
                      strokeWidth={2}
                    />
                    {isSel && <Circle cx={p.x} cy={p.y} r={2.5} fill={Colors.card} />}
                  </G>
                );
              })}

              {/* X-axis labels */}
              {data.map((d, i) => {
                const x = xForIndex(i);
                const isSelected = selectedIdx === i;
                // Show all labels for weekly (7 pts), every other for monthly (4), every 2 for yearly (12), every 2 for overview
                const skip =
                  (period === 'yearly' && n > 8 && i % 2 !== 0) ? true : false;
                if (skip) return null;
                return (
                  <SvgText
                    key={`xlabel-${i}`}
                    x={x}
                    y={CHART_H - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={isSelected ? '700' : '500'}
                    fill={isSelected ? Colors.primary : Colors.textMuted}
                  >
                    {d.label}
                  </SvgText>
                );
              })}
            </Svg>

            {/* Floating tooltip */}
            {selected && (
              <View
                pointerEvents="none"
                style={[
                  styles.tooltip,
                  {
                    left: Math.min(
                      Math.max(selected.x - 42, 0),
                      chartWidth - 88
                    ),
                    top: Math.max(selected.y - 60, 2),
                    borderColor: selected.config.color,
                  },
                ]}
              >
                <Text style={styles.tooltipEmoji}>{selected.config.emoji}</Text>
                <Text style={[styles.tooltipMood, { color: selected.config.color }]}>
                  {selected.config.label}
                </Text>
                <Text style={styles.tooltipLabel}>{selected.label}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  chartWrap: {
    minHeight: CHART_H,
  },
  empty: {
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  tooltip: {
    position: 'absolute',
    width: 84,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  tooltipEmoji: {
    fontSize: 16,
  },
  tooltipMood: {
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
