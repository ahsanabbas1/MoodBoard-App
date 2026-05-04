import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { toDateString } from '../utils/date';
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
import { getMoodConfig, MOODS } from '../constants/Moods';
import { MoodEntry, MoodLevel } from '../types';

export type Period = 'overview' | 'weekly' | 'monthly' | 'yearly';

const TABS: { key: Period; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const CHART_H = 170;
const PAD_LEFT = 56;
const PAD_RIGHT = 8;
const PAD_TOP = 14;
const PAD_BOTTOM = 24;
const PLOT_H = CHART_H - PAD_TOP - PAD_BOTTOM;
const MIN_MOOD = 1;
const MAX_MOOD = 6;

const Y_LABELS = [...MOODS].sort((a, b) => b.level - a.level);

interface DataPoint {
  label: string;
  showLabel: boolean;
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

export interface Props {
  entries: MoodEntry[];
  period: Period;
  offsets: Record<Period, number>;
  onPeriodChange: (p: Period) => void;
  onOffsetChange: (p: Period, offset: number) => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function moodToY(value: number): number {
  return PAD_TOP + PLOT_H - ((value - MIN_MOOD) / (MAX_MOOD - MIN_MOOD)) * PLOT_H;
}

function getWeekBounds(offset: number): { startStr: string; endStr: string; startDate: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const toMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + toMon + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    startDate: monday,
    startStr: toDateString(monday),   // local date
    endStr:   toDateString(sunday),   // local date
  };
}

export function filterEntriesByPeriod(
  entries: MoodEntry[],
  period: Period,
  offset: number
): MoodEntry[] {
  const now = new Date();
  if (period === 'monthly') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return entries.filter((e) => e.date.startsWith(ms));
  }
  if (period === 'weekly') {
    const { startStr, endStr } = getWeekBounds(offset);
    return entries.filter((e) => e.date >= startStr && e.date <= endStr);
  }
  // overview + yearly both use calendar year
  const year = now.getFullYear() + offset;
  return entries.filter((e) => e.date.startsWith(String(year)));
}

function getNavLabel(period: Period, offset: number): string {
  const now = new Date();
  if (period === 'monthly') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (period === 'weekly') {
    const { startDate } = getWeekBounds(offset);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(startDate)} – ${fmt(endDate)}`;
  }
  // overview + yearly: just the year
  return String(now.getFullYear() + offset);
}

function getData(entries: MoodEntry[], period: Period, offset: number): DataPoint[] {
  const now = new Date();

  if (period === 'monthly') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const ms = `${year}-${String(month + 1).padStart(2, '0')}`;
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${ms}-${String(day).padStart(2, '0')}`;
      const dayEntries = entries.filter((e) => e.date === dateStr);
      return {
        label: String(day),
        showLabel: day === 1 || day % 5 === 0,
        avg: dayEntries.length
          ? dayEntries.reduce((s, e) => s + e.mood, 0) / dayEntries.length
          : null,
      };
    });
  }

  if (period === 'weekly') {
    const { startDate } = getWeekBounds(offset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = toDateString(d);   // local date
      const dayEntries = entries.filter((e) => e.date === dateStr);
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        showLabel: true,
        avg: dayEntries.length
          ? dayEntries.reduce((s, e) => s + e.mood, 0) / dayEntries.length
          : null,
      };
    });
  }

  if (period === 'yearly') {
    const year = now.getFullYear() + offset;
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      // hide future months in current year
      if (offset === 0 && d > now) {
        return {
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          showLabel: true,
          avg: null,
        };
      }
      const ms = `${year}-${String(i + 1).padStart(2, '0')}`;
      const mEntries = entries.filter((e) => e.date.startsWith(ms));
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        showLabel: true,
        avg: mEntries.length
          ? mEntries.reduce((s, e) => s + e.mood, 0) / mEntries.length
          : null,
      };
    });
  }

  // Overview: 12 months of target year
  const year = now.getFullYear() + offset;
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    if (offset === 0 && d > now) {
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        showLabel: true,
        avg: null,
      };
    }
    const ms = `${year}-${String(i + 1).padStart(2, '0')}`;
    const mEntries = entries.filter((e) => e.date.startsWith(ms));
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      showLabel: true,
      avg: mEntries.length
        ? mEntries.reduce((s, e) => s + e.mood, 0) / mEntries.length
        : null,
    };
  });
}

function buildSegments(data: DataPoint[], plotPoints: PlotPoint[]): { x: number; y: number }[][] {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  data.forEach((_d, i) => {
    const pp = plotPoints.find((p) => p.dataIndex === i);
    if (pp) {
      cur.push({ x: pp.x, y: pp.y });
    } else if (cur.length > 0) {
      segs.push(cur);
      cur = [];
    }
  });
  if (cur.length > 0) segs.push(cur);
  return segs;
}

function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function areaPath(pts: { x: number; y: number }[], bottomY: number): string {
  if (pts.length < 2) return '';
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return `${line} L${pts[pts.length - 1].x.toFixed(1)},${bottomY} L${pts[0].x.toFixed(1)},${bottomY} Z`;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function MoodAreaChart({
  entries,
  period,
  offsets,
  onPeriodChange,
  onOffsetChange,
}: Props) {
  const [chartWidth, setChartWidth] = useState(320);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const offset = offsets[period];
  const data = getData(entries, period, offset);
  const n = data.length;
  const plotW = chartWidth - PAD_LEFT - PAD_RIGHT;
  const bottomY = PAD_TOP + PLOT_H;

  function xFor(i: number) {
    return n > 1 ? PAD_LEFT + (i / (n - 1)) * plotW : PAD_LEFT + plotW / 2;
  }

  const plotPoints: PlotPoint[] = data
    .map((d, i) => {
      if (d.avg === null) return null;
      const level = Math.max(MIN_MOOD, Math.min(MAX_MOOD, Math.round(d.avg))) as MoodLevel;
      return {
        x: xFor(i),
        y: moodToY(d.avg),
        label: d.label,
        avg: d.avg,
        config: getMoodConfig(level),
        dataIndex: i,
      };
    })
    .filter(Boolean) as PlotPoint[];

  const segments = buildSegments(data, plotPoints);
  const selected =
    selectedIdx !== null ? plotPoints.find((p) => p.dataIndex === selectedIdx) ?? null : null;

  const dotR = n > 14 ? 3 : 4;
  const canGoForward = offset < 0;

  function goBack() {
    onOffsetChange(period, offset - 1);
    setSelectedIdx(null);
  }
  function goForward() {
    if (!canGoForward) return;
    onOffsetChange(period, offset + 1);
    setSelectedIdx(null);
  }

  return (
    <View style={styles.root}>
      {/* Period tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, period === t.key && styles.tabActive]}
            onPress={() => { onPeriodChange(t.key); setSelectedIdx(null); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, period === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation row — all periods */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{getNavLabel(period, offset)}</Text>
        <TouchableOpacity
          style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
          onPress={goForward}
          activeOpacity={canGoForward ? 0.7 : 1}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canGoForward ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Chart */}
      <View
        style={styles.chartWrap}
        onLayout={(e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width)}
      >
        {plotPoints.length < 2 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data for this period</Text>
          </View>
        ) : (
          <View style={{ position: 'relative' }}>
            <Svg width={chartWidth} height={CHART_H}>
              <Defs>
                <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.20" />
                  <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0.01" />
                </SvgGradient>
              </Defs>

              {/* Y-axis grid lines + labels */}
              {Y_LABELS.map((m) => {
                const gy = moodToY(m.level);
                return (
                  <G key={`y-${m.level}`}>
                    <Line
                      x1={PAD_LEFT}
                      y1={gy}
                      x2={chartWidth - PAD_RIGHT}
                      y2={gy}
                      stroke={Colors.border}
                      strokeWidth={1}
                      strokeDasharray="3,4"
                    />
                    <SvgText
                      x={PAD_LEFT - 6}
                      y={gy + 4}
                      textAnchor="end"
                      fontSize={9}
                      fontWeight="500"
                      fill={Colors.textMuted}
                    >
                      {m.label}
                    </SvgText>
                  </G>
                );
              })}

              {/* Area fills */}
              {segments.map((seg, si) => (
                <Path key={`area-${si}`} d={areaPath(seg, bottomY)} fill="url(#areaGrad)" />
              ))}

              {/* Lines */}
              {segments.map((seg, si) => (
                <Path
                  key={`line-${si}`}
                  d={linePath(seg)}
                  fill="none"
                  stroke={Colors.primary}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {/* Dots */}
              {plotPoints.map((p) => {
                const isSel = selectedIdx === p.dataIndex;
                return (
                  <G
                    key={`dot-${p.dataIndex}`}
                    onPress={() => setSelectedIdx(isSel ? null : p.dataIndex)}
                  >
                    <Circle cx={p.x} cy={p.y} r={14} fill="transparent" />
                    {isSel && (
                      <Circle cx={p.x} cy={p.y} r={dotR + 5} fill={p.config.color} fillOpacity={0.18} />
                    )}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={isSel ? dotR + 2 : dotR}
                      fill={isSel ? p.config.color : Colors.card}
                      stroke={isSel ? p.config.color : Colors.primary}
                      strokeWidth={1.8}
                    />
                    {isSel && <Circle cx={p.x} cy={p.y} r={dotR - 1} fill={Colors.card} />}
                  </G>
                );
              })}

              {/* X-axis labels */}
              {data.map((d, i) => {
                if (!d.showLabel) return null;
                const isSel = selectedIdx === i;
                return (
                  <SvgText
                    key={`xl-${i}`}
                    x={xFor(i)}
                    y={CHART_H - 5}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={isSel ? '700' : '500'}
                    fill={isSel ? Colors.primary : Colors.textMuted}
                  >
                    {d.label}
                  </SvgText>
                );
              })}
            </Svg>

            {/* Tooltip */}
            {selected && (
              <View
                pointerEvents="none"
                style={[
                  styles.tooltip,
                  {
                    left: Math.min(Math.max(selected.x - 40, PAD_LEFT), chartWidth - 82),
                    top: Math.max(selected.y - 62, 0),
                    borderColor: selected.config.color,
                  },
                ]}
              >
                <Text style={styles.tooltipEmoji}>{selected.config.emoji}</Text>
                <Text style={[styles.tooltipMood, { color: selected.config.color }]}>
                  {selected.config.label}
                </Text>
                <Text style={styles.tooltipDate}>{selected.label}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center' },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  navBtn: { padding: 6, borderRadius: 8, backgroundColor: Colors.primaryLight },
  navBtnDisabled: { backgroundColor: Colors.border },
  monthTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  chartWrap: { minHeight: CHART_H },
  empty: { height: CHART_H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: Colors.textMuted },

  tooltip: {
    position: 'absolute',
    width: 80,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  tooltipEmoji: { fontSize: 15 },
  tooltipMood: { fontSize: 11, fontWeight: '700' },
  tooltipDate: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
});
