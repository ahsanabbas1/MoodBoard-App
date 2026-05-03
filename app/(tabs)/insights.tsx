import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useMood } from '../../store/MoodContext';
import { MOODS, getMoodConfig } from '../../constants/Moods';
import { MoodLevel } from '../../types';
import MoodAreaChart from '../../components/MoodAreaChart';
import MoodDistributionPie from '../../components/MoodDistributionPie';
import SectionHeader from '../../components/SectionHeader';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function InsightsScreen() {
  const { entries, getAverageMood, getStreak } = useMood();

  // Last 30 days data
  const last30 = entries.filter((e) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return e.date >= cutoff.toISOString().split('T')[0];
  });

  // Average mood
  const avg7 = getAverageMood(7);
  const avg30 = getAverageMood(30);
  const streak = getStreak();

  // Most common mood
  const moodCounts = MOODS.map((m) => ({
    ...m,
    count: last30.filter((e) => e.mood === m.level).length,
  })).sort((a, b) => b.count - a.count);
  const topMood = moodCounts[0];

  // Best / worst day of week
  const dayStats: Record<number, number[]> = {};
  last30.forEach((e) => {
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

  // Most common tags
  const tagCounts: Record<string, number> = {};
  last30.forEach((e) => {
    e.tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Monthly bar chart (last 4 weeks daily avg by week)
  const weeklyAvg = Array.from({ length: 4 }, (_, wi) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (3 - wi) * 7 - 6);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEntries = last30.filter((e) => {
      return e.date >= weekStart.toISOString().split('T')[0] &&
        e.date <= weekEnd.toISOString().split('T')[0];
    });
    const avg = weekEntries.length
      ? weekEntries.reduce((s, e) => s + e.mood, 0) / weekEntries.length
      : 0;
    return { label: `W${wi + 1}`, avg, count: weekEntries.length };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Insights</Text>

        {/* Summary Cards */}
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
              {last30.length}
            </Text>
            <Text style={styles.summaryLabel}>This month</Text>
          </View>
        </View>

        {/* Mood Over Time */}
        <View style={styles.card}>
          <SectionHeader title="Mood Over Time" />
          <MoodAreaChart entries={entries} />
        </View>

        {/* Mood Distribution */}
        <View style={styles.card}>
          <SectionHeader title="Mood Distribution (30 days)" />
          {last30.length > 0 ? (
            <MoodDistributionPie entries={last30} />
          ) : (
            <Text style={styles.noData}>Not enough data yet</Text>
          )}
        </View>

        {/* Weekly Trend */}
        <View style={styles.card}>
          <SectionHeader title="Weekly Trend" />
          <View style={styles.weeklyBars}>
            {weeklyAvg.map((w, i) => {
              const barH = w.avg > 0 ? (w.avg / 5) * 80 : 4;
              const config = w.avg > 0 ? getMoodConfig(Math.round(w.avg) as MoodLevel) : null;
              return (
                <View key={i} style={styles.weeklyBarCol}>
                  {config && <Text style={styles.weeklyEmoji}>{config.emoji}</Text>}
                  <View style={styles.weeklyBarTrack}>
                    <View
                      style={[
                        styles.weeklyBar,
                        {
                          height: barH,
                          backgroundColor: config ? config.color : Colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.weeklyLabel}>{w.label}</Text>
                  <Text style={styles.weeklyCount}>{w.count}d</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Most Common Mood */}
        {topMood && topMood.count > 0 && (
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: topMood.color }]}>
            <Text style={styles.insightLabel}>Most Common Mood</Text>
            <View style={styles.insightRow}>
              <Text style={{ fontSize: 36 }}>{topMood.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightValue, { color: topMood.color }]}>{topMood.label}</Text>
                <Text style={styles.insightSub}>
                  {topMood.count} out of {last30.length} entries this month
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Best / Worst Day */}
        {bestDay && worstDay && bestDay.day !== worstDay.day && (
          <View style={styles.dayRow}>
            <View style={[styles.dayCard, { borderColor: getMoodConfig(5).color }]}>
              <Text style={styles.dayCardIcon}>😄</Text>
              <Text style={styles.dayCardTitle}>Best Day</Text>
              <Text style={[styles.dayCardValue, { color: getMoodConfig(5).color }]}>
                {DAY_NAMES[bestDay.day]}
              </Text>
              <Text style={styles.dayCardSub}>avg {bestDay.avg.toFixed(1)}/5</Text>
            </View>
            <View style={[styles.dayCard, { borderColor: getMoodConfig(1).color }]}>
              <Text style={styles.dayCardIcon}>😔</Text>
              <Text style={styles.dayCardTitle}>Tough Day</Text>
              <Text style={[styles.dayCardValue, { color: getMoodConfig(1).color }]}>
                {DAY_NAMES[worstDay.day]}
              </Text>
              <Text style={styles.dayCardSub}>avg {worstDay.avg.toFixed(1)}/5</Text>
            </View>
          </View>
        )}

        {/* Top Tags */}
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

  weeklyBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', gap: 8 },
  weeklyBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  weeklyEmoji: { fontSize: 16 },
  weeklyBarTrack: {
    width: 40,
    height: 80,
    backgroundColor: Colors.border,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weeklyBar: { width: '100%', borderRadius: 10, minHeight: 4 },
  weeklyLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  weeklyCount: { fontSize: 10, color: Colors.textMuted },

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
