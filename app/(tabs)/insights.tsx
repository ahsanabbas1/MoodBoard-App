import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useMood } from '../../store/MoodContext';
import { MOODS, getMoodConfig } from '../../constants/Moods';
import { MoodLevel } from '../../types';
import MoodAreaChart, { Period, filterEntriesByPeriod } from '../../components/MoodAreaChart';
import MoodDistributionPie from '../../components/MoodDistributionPie';
import SectionHeader from '../../components/SectionHeader';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function periodLabel(period: Period, offset: number): string {
  const now = new Date();
  if (period === 'monthly') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return offset === 0 ? 'this month' : `in ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  if (period === 'weekly') {
    if (offset === 0) return 'this week';
    if (offset === -1) return 'last week';
    return `${Math.abs(offset)} weeks ago`;
  }
  const year = now.getFullYear() + offset;
  return offset === 0 ? `in ${year}` : `in ${year}`;
}

export default function InsightsScreen() {
  const { entries, getAverageMood, getStreak } = useMood();

  const [chartPeriod, setChartPeriod] = useState<Period>('monthly');
  const [chartOffsets, setChartOffsets] = useState<Record<Period, number>>({
    overview: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  });

  const currentOffset = chartOffsets[chartPeriod];
  const filteredEntries = filterEntriesByPeriod(entries, chartPeriod, currentOffset);

  // Global summary stats (always reflect full history)
  const avg7 = getAverageMood(7);
  const avg30 = getAverageMood(30);
  const streak = getStreak();

  // Most common mood — dynamic
  const moodCounts = MOODS.map((m) => ({
    ...m,
    count: filteredEntries.filter((e) => e.mood === m.level).length,
  })).sort((a, b) => b.count - a.count);
  const topMood = moodCounts[0];

  // Best / worst day of week — dynamic
  const dayStats: Record<number, number[]> = {};
  filteredEntries.forEach((e) => {
    const day = new Date(e.date + 'T12:00:00').getDay();
    if (!dayStats[day]) dayStats[day] = [];
    dayStats[day].push(e.mood);
  });
  const dayAverages = Object.entries(dayStats)
    .map(([day, moods]) => ({
      day: parseInt(day),
      avg: moods.reduce((s, m) => s + m, 0) / moods.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const bestDay = dayAverages[0];
  const worstDay = dayAverages[dayAverages.length - 1];

  // Top tags — dynamic
  const tagCounts: Record<string, number> = {};
  filteredEntries.forEach((e) => {
    e.tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const pLabel = periodLabel(chartPeriod, currentOffset);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Insights</Text>

        {/* Summary Cards — global stats */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>📊</Text>
            <Text style={styles.summaryValue}>
              {avg7 > 0 ? getMoodConfig(Math.round(avg7) as MoodLevel).emoji : '—'}
            </Text>
            <Text style={styles.summaryLabel}>7-day avg</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>📆</Text>
            <Text style={styles.summaryValue}>
              {avg30 > 0 ? getMoodConfig(Math.round(avg30) as MoodLevel).emoji : '—'}
            </Text>
            <Text style={styles.summaryLabel}>30-day avg</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🔥</Text>
            <Text style={[styles.summaryValue, { fontSize: 22, color: streak > 0 ? '#F97316' : Colors.textMuted }]}>
              {streak}
            </Text>
            <Text style={styles.summaryLabel}>Day streak</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>📝</Text>
            <Text style={[styles.summaryValue, { fontSize: 22, color: Colors.primary }]}>
              {filteredEntries.length}
            </Text>
            <Text style={styles.summaryLabel} numberOfLines={1}>{pLabel}</Text>
          </View>
        </View>

        {/* Mood Over Time */}
        <View style={styles.card}>
          <SectionHeader title="Mood Over Time" />
          <MoodAreaChart
            entries={entries}
            period={chartPeriod}
            offsets={chartOffsets}
            onPeriodChange={(p) => setChartPeriod(p)}
            onOffsetChange={(p, o) => setChartOffsets((prev) => ({ ...prev, [p]: o }))}
          />
        </View>

        {/* Mood Distribution — dynamic */}
        <View style={styles.card}>
          <SectionHeader title="Mood Distribution" />
          {filteredEntries.length > 0 ? (
            <MoodDistributionPie entries={filteredEntries} />
          ) : (
            <Text style={styles.noData}>No data for this period</Text>
          )}
        </View>

        {/* Most Common Mood — dynamic */}
        {topMood && topMood.count > 0 && (
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: topMood.color }]}>
            <Text style={styles.insightLabel}>Most Common Mood</Text>
            <View style={styles.insightRow}>
              <Text style={{ fontSize: 36 }}>{topMood.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightValue, { color: topMood.color }]}>{topMood.label}</Text>
                <Text style={styles.insightSub}>
                  {topMood.count} of {filteredEntries.length} entries {pLabel}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Best / Tough Day — dynamic */}
        {bestDay && worstDay && bestDay.day !== worstDay.day && (
          <View style={styles.dayRow}>
            <View style={[styles.dayCard, { borderColor: getMoodConfig(6).color }]}>
              <Text style={styles.dayCardIcon}>😄</Text>
              <Text style={styles.dayCardTitle}>Best Day</Text>
              <Text style={[styles.dayCardValue, { color: getMoodConfig(6).color }]}>
                {DAY_NAMES[bestDay.day]}
              </Text>
              <Text style={styles.dayCardSub}>avg {bestDay.avg.toFixed(1)}/6</Text>
            </View>
            <View style={[styles.dayCard, { borderColor: getMoodConfig(1).color }]}>
              <Text style={styles.dayCardIcon}>😔</Text>
              <Text style={styles.dayCardTitle}>Tough Day</Text>
              <Text style={[styles.dayCardValue, { color: getMoodConfig(1).color }]}>
                {DAY_NAMES[worstDay.day]}
              </Text>
              <Text style={styles.dayCardSub}>avg {worstDay.avg.toFixed(1)}/6</Text>
            </View>
          </View>
        )}

        {/* Top Influences — dynamic */}
        {topTags.length > 0 && (
          <View style={styles.card}>
            <SectionHeader title="Top Influences" />
            <View style={styles.tagsGrid}>
              {topTags.map(([tag, count]) => (
                <View key={tag} style={styles.tagItem}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{tag}</Text>
                  </View>
                  <Text style={styles.tagCount}>{count}x</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    paddingTop: 16,
  },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryEmoji: { fontSize: 16 },
  summaryValue: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  summaryLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', textAlign: 'center' },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },

  noData: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 8 },

  insightLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  insightValue: { fontSize: 20, fontWeight: '700' },
  insightSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  dayRow: { flexDirection: 'row', gap: 12 },
  dayCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dayCardIcon: { fontSize: 28 },
  dayCardTitle: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  dayCardValue: { fontSize: 16, fontWeight: '700' },
  dayCardSub: { fontSize: 11, color: Colors.textMuted },

  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  tagBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  tagCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
});
