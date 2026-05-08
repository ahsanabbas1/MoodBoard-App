import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AnimatedEmoji from "../../components/AnimatedEmoji";
import { useState, useEffect, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { useMood } from "../../store/MoodContext";
import { MOODS, getMoodConfig } from "../../constants/Moods";
import { MoodLevel } from "../../types";
import MoodAreaChart, {
  Period,
  filterEntriesByPeriod,
} from "../../components/MoodAreaChart";
import MoodDistributionPie from "../../components/MoodDistributionPie";
import SectionHeader from "../../components/SectionHeader";
import {
  fetchAIInsights,
  InsightsResult,
  InsightCategory,
} from "../../services/aiInsightsService";
import { useAuth } from "../../store/AuthContext";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function periodLabel(period: Period, offset: number): string {
  const now = new Date();
  if (period === "monthly") {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return offset === 0
      ? "this month"
      : `in ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }
  if (period === "weekly") {
    if (offset === 0) return "this week";
    if (offset === -1) return "last week";
    return `${Math.abs(offset)} weeks ago`;
  }
  const year = now.getFullYear() + offset;
  return offset === 0 ? `in ${year}` : `in ${year}`;
}

// Gradient colours per insight category
const CATEGORY_GRADIENTS: Record<InsightCategory, [string, string]> = {
  achievement: ["#ECFDF5", "#D1FAE5"],
  pattern: ["#EEF0FF", "#F5F3FF"],
  suggestion: ["#EFF6FF", "#DBEAFE"],
  warning: ["#FFF7ED", "#FFEDD5"],
};
const CATEGORY_ICON_BG: Record<InsightCategory, string> = {
  achievement: "#A7F3D0",
  pattern: Colors.primaryLight,
  suggestion: "#BFDBFE",
  warning: "#FED7AA",
};
const CATEGORY_TEXT_COLOR: Record<InsightCategory, string> = {
  achievement: "#065F46",
  pattern: Colors.textPrimary,
  suggestion: "#1E3A5F",
  warning: "#7C2D12",
};

export default function InsightsScreen() {
  const { entries, getAverageMood, getStreak } = useMood();
  const { user } = useAuth();

  const [chartPeriod, setChartPeriod] = useState<Period>("monthly");
  const [chartOffsets, setChartOffsets] = useState<Record<Period, number>>({
    overview: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  });

  const currentOffset = chartOffsets[chartPeriod];
  const filteredEntries = filterEntriesByPeriod(
    entries,
    chartPeriod,
    currentOffset,
  );

  // Global summary stats (always reflect full history)
  const avg7 = getAverageMood(7);
  const avg30 = getAverageMood(30);
  const streak = getStreak();

  // Most common mood — from FULL history so it always has a meaningful value
  const moodCounts = MOODS.map((m) => ({
    ...m,
    count: entries.filter((e) => e.mood === m.level).length,
  })).sort((a, b) => b.count - a.count);
  const topMood = moodCounts[0]?.count > 0 ? moodCounts[0] : null;

  // Best / worst day of week — from FULL history (needs enough data across days)
  const dayStats: Record<number, number[]> = {};
  entries.forEach((e) => {
    const day = new Date(e.date + "T12:00:00").getDay();
    if (!dayStats[day]) dayStats[day] = [];
    dayStats[day].push(e.mood);
  });
  const dayAverages = Object.entries(dayStats)
    .map(([day, moods]) => ({
      day: parseInt(day),
      avg: moods.reduce((s, m) => s + m, 0) / moods.length,
      count: moods.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const bestDay = dayAverages.length >= 2 ? dayAverages[0] : null;
  const worstDay =
    dayAverages.length >= 2 ? dayAverages[dayAverages.length - 1] : null;

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

  // --- AI insights state ---
  const [aiResult, setAiResult] = useState<InsightsResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    if (entries.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await fetchAIInsights(entries, user?.id ?? "");
      setAiResult(result);
    } catch {
      setAiError("Unable to load insights. Tap to retry.");
    } finally {
      setAiLoading(false);
    }
  }, [entries]);

  // Load on mount and whenever the entry list grows
  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Insights</Text>

        {/* Summary Cards — global stats */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <AnimatedEmoji
              emoji="📊"
              type="bounceIn"
              delay={0}
              style={styles.summaryEmoji}
            />
            <Text style={styles.summaryValue}>
              {avg7 > 0
                ? getMoodConfig(Math.round(avg7) as MoodLevel).emoji
                : "—"}
            </Text>
            <Text style={styles.summaryLabel}>7-day avg</Text>
          </View>
          <View style={styles.summaryCard}>
            <AnimatedEmoji
              emoji="📆"
              type="bounceIn"
              delay={80}
              style={styles.summaryEmoji}
            />
            <Text style={styles.summaryValue}>
              {avg30 > 0
                ? getMoodConfig(Math.round(avg30) as MoodLevel).emoji
                : "—"}
            </Text>
            <Text style={styles.summaryLabel}>30-day avg</Text>
          </View>
          <View style={styles.summaryCard}>
            <AnimatedEmoji
              emoji="🔥"
              type="bounceIn"
              delay={160}
              style={styles.summaryEmoji}
            />
            <Text
              style={[
                styles.summaryValue,
                {
                  fontSize: 22,
                  color: streak > 0 ? "#F97316" : Colors.textMuted,
                },
              ]}
            >
              {streak}
            </Text>
            <Text style={styles.summaryLabel}>Day streak</Text>
          </View>
          <View style={styles.summaryCard}>
            <AnimatedEmoji
              emoji="📝"
              type="bounceIn"
              delay={240}
              style={styles.summaryEmoji}
            />
            <Text
              style={[
                styles.summaryValue,
                { fontSize: 22, color: Colors.primary },
              ]}
            >
              {filteredEntries.length}
            </Text>
            <Text style={styles.summaryLabel} numberOfLines={1}>
              {pLabel}
            </Text>
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
            onOffsetChange={(p, o) =>
              setChartOffsets((prev) => ({ ...prev, [p]: o }))
            }
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

        {/* Most Common Mood — from full history */}
        {topMood && (
          <View
            style={[
              styles.card,
              { borderLeftWidth: 4, borderLeftColor: topMood.color },
            ]}
          >
            <Text style={styles.insightLabel}>Most Common Mood</Text>
            <View style={styles.insightRow}>
              <AnimatedEmoji
                emoji={topMood.emoji}
                type="pulse"
                style={{ fontSize: 36 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightValue, { color: topMood.color }]}>
                  {topMood.label}
                </Text>
                <Text style={styles.insightSub}>
                  {topMood.count} of {entries.length} total entries
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Best / Tough Day — from full history, needs data on at least 2 different days */}
        {bestDay && worstDay && bestDay.day !== worstDay.day && (
          <View style={styles.dayRow}>
            <View
              style={[styles.dayCard, { borderColor: getMoodConfig(6).color }]}
            >
              <AnimatedEmoji
                emoji="😄"
                type="bounceIn"
                style={styles.dayCardIcon}
              />
              <Text style={styles.dayCardTitle}>Best Day</Text>
              <Text
                style={[styles.dayCardValue, { color: getMoodConfig(6).color }]}
              >
                {DAY_NAMES[bestDay.day]}
              </Text>
              <Text style={styles.dayCardSub}>
                avg {bestDay.avg.toFixed(1)}/6
              </Text>
            </View>
            <View
              style={[styles.dayCard, { borderColor: getMoodConfig(1).color }]}
            >
              <AnimatedEmoji
                emoji="😔"
                type="bounceIn"
                delay={100}
                style={styles.dayCardIcon}
              />
              <Text style={styles.dayCardTitle}>Tough Day</Text>
              <Text
                style={[styles.dayCardValue, { color: getMoodConfig(1).color }]}
              >
                {DAY_NAMES[worstDay.day]}
              </Text>
              <Text style={styles.dayCardSub}>
                avg {worstDay.avg.toFixed(1)}/6
              </Text>
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

        {/* AI Insights */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeaderRow}>
            <LinearGradient
              colors={["#7C6FFF", "#A78BFA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiIconBadge}
            >
              <Ionicons name="sparkles" size={14} color="#fff" />
            </LinearGradient>
            <Text style={styles.aiSectionTitle}>AI Insights</Text>
            {aiResult?.fromCache && (
              <View style={styles.aiBetaBadge}>
                <Text style={styles.aiBetaText}>Cached</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={loadInsights}
              disabled={aiLoading}
              style={styles.aiRefreshBtn}
            >
              {aiLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="refresh" size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Summary */}
          {aiResult && !aiLoading && (
            <View style={styles.aiSummaryBox}>
              <Text style={styles.aiSummaryText}>{aiResult.summary}</Text>
            </View>
          )}

          {/* Loading skeleton */}
          {aiLoading && !aiResult && (
            <View style={styles.aiLoadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.aiLoadingText}>
                Analysing your mood patterns…
              </Text>
            </View>
          )}

          {/* Error state */}
          {aiError && !aiLoading && (
            <TouchableOpacity style={styles.aiErrorBox} onPress={loadInsights}>
              <Ionicons name="alert-circle-outline" size={20} color="#F97316" />
              <Text style={styles.aiErrorText}>{aiError}</Text>
            </TouchableOpacity>
          )}

          {/* No data */}
          {!aiLoading && !aiError && entries.length === 0 && (
            <Text style={styles.aiDisclaimer}>
              Log at least one mood entry to see your personalised insights.
            </Text>
          )}

          {/* Dynamic insight cards */}
          {aiResult?.insights.map((insight, i) => (
            <LinearGradient
              key={i}
              colors={CATEGORY_GRADIENTS[insight.category]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiCard}
            >
              <View
                style={[
                  styles.aiCardIcon,
                  { backgroundColor: CATEGORY_ICON_BG[insight.category] },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{insight.emoji}</Text>
              </View>
              <View style={styles.aiCardBody}>
                <Text
                  style={[
                    styles.aiCardTitle,
                    { color: CATEGORY_TEXT_COLOR[insight.category] },
                  ]}
                >
                  {insight.title}
                </Text>
                <Text style={styles.aiCardText}>{insight.body}</Text>
              </View>
            </LinearGradient>
          ))}

          {aiResult && (
            <Text style={styles.aiDisclaimer}>
              Based on your {Math.min(entries.length, 100)} most recent entries
              ·{" "}
              {new Date(aiResult.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </View>
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
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    paddingTop: 16,
  },

  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryEmoji: { fontSize: 16 },
  summaryValue: { fontSize: 26, fontWeight: "700", color: Colors.textPrimary },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "500",
    textAlign: "center",
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },

  noData: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },

  insightLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },
  insightRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  insightValue: { fontSize: 20, fontWeight: "700" },
  insightSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  dayRow: { flexDirection: "row", gap: 12 },
  dayCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dayCardIcon: { fontSize: 28 },
  dayCardTitle: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },
  dayCardValue: { fontSize: 16, fontWeight: "700" },
  dayCardSub: { fontSize: 11, color: Colors.textMuted },

  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  tagBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  tagBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  tagCount: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },

  // AI Insights
  aiSection: { gap: 12 },
  aiHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  aiSectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
    flex: 1,
  },
  aiBetaBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  aiBetaText: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  aiCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  aiCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiCardBody: { flex: 1, gap: 4 },
  aiCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  aiCardText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  aiRefreshBtn: { padding: 4 },
  aiSummaryBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
  },
  aiSummaryText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    lineHeight: 20,
  },
  aiLoadingBox: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  aiLoadingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  aiErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
  },
  aiErrorText: {
    fontSize: 13,
    color: "#C2410C",
    flex: 1,
  },
  aiDisclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 8,
  },
});
