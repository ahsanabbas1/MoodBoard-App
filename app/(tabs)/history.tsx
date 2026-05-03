import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Colors } from "../../constants/Colors";
import { useMood } from "../../store/MoodContext";
import { getMoodConfig } from "../../constants/Moods";
import { MoodLevel } from "../../types";
import EntryCard from "../../components/EntryCard";
import SectionHeader from "../../components/SectionHeader";

type ViewMode = "week" | "month";
type EntryViewMode = "detailed" | "compact";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateStr(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HistoryScreen() {
  const { entries } = useMood();
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(today));
  const [calMonth, setCalMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const selectedEntries = entries.filter((e) => e.date === selectedDate);

  // Build calendar grid
  const firstDay = (calMonth.getDay() + 6) % 7; // Adjust so Monday is first day (0)
  const daysInMonth = new Date(
    calMonth.getFullYear(),
    calMonth.getMonth() + 1,
    0,
  ).getDate();
  const numberOfCells = firstDay + daysInMonth;
  const trailingNulls = (7 - (numberOfCells % 7)) % 7;
  const calendarDays: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(calMonth.getFullYear(), calMonth.getMonth(), i + 1),
    ),
    ...Array(trailingNulls).fill(null),
  ];

  const moodByDate: Record<string, MoodLevel> = {};
  entries.forEach((e) => {
    if (!moodByDate[e.date]) moodByDate[e.date] = e.mood;
  });

  function prevMonth() {
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  }
  function nextMonth() {
    const next = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
    if (next <= today) setCalMonth(next);
  }

  // Week view: last 7 days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const [showAll, setShowAll] = useState(false);
  const [entryViewMode, setEntryViewMode] = useState<EntryViewMode>("detailed");

  const windowEntries = entries.filter((entry) => {
    if (viewMode === "month") {
      const [year, month] = entry.date.split("-").map(Number);
      return (
        year === calMonth.getFullYear() && month === calMonth.getMonth() + 1
      );
    }

    const weekStart = weekDays[0].toISOString().split("T")[0];
    const weekEnd = weekDays[6].toISOString().split("T")[0];
    return entry.date >= weekStart && entry.date <= weekEnd;
  });

  const recentEntries = windowEntries.slice(0, 15);
  const displayedEntries = showAll ? windowEntries : recentEntries;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <View style={styles.toggle}>
            {(["week", "month"] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.toggleBtn,
                  viewMode === mode && styles.toggleBtnActive,
                ]}
                onPress={() => setViewMode(mode)}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    viewMode === mode && styles.toggleBtnTextActive,
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.card}>
          {viewMode === "month" ? (
            <>
              {/* Month nav */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <Text style={styles.navBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                </Text>
                <TouchableOpacity
                  onPress={nextMonth}
                  style={[
                    styles.navBtn,
                    calMonth.getMonth() === today.getMonth() &&
                      calMonth.getFullYear() === today.getFullYear() &&
                      styles.navBtnDisabled,
                  ]}
                  disabled={
                    calMonth.getMonth() === today.getMonth() &&
                    calMonth.getFullYear() === today.getFullYear()
                  }
                >
                  <Text style={styles.navBtnText}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={styles.dayHeaders}>
                {DAYS.map((d, i) => (
                  <Text key={i} style={styles.dayHeaderText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calGrid}>
                {calendarDays.map((date, idx) => {
                  if (!date)
                    return <View key={`empty_${idx}`} style={styles.calCell} />;
                  const dateStr = toDateStr(date);
                  const mood = moodByDate[dateStr];
                  const config = mood ? getMoodConfig(mood) : null;
                  const isSelected = dateStr === selectedDate;
                  const isToday = isSameDate(date, today);
                  const isFuture = date > today;

                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[
                        styles.calCell,
                        isSelected && {
                          backgroundColor: Colors.primaryLight,
                          borderRadius: 10,
                        },
                      ]}
                      onPress={() => !isFuture && setSelectedDate(dateStr)}
                      disabled={isFuture}
                    >
                      {config ? (
                        <View
                          style={[
                            styles.moodDot,
                            {
                              backgroundColor: config.bgColor,
                              borderRadius: 8,
                            },
                          ]}
                        >
                          <Text style={styles.calEmoji}>{config.emoji}</Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.calDayNum,
                            isFuture && {
                              color: Colors.textMuted,
                              opacity: 0.4,
                            },
                            isToday &&
                              !config && {
                                color: Colors.primary,
                                fontWeight: "700",
                              },
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      )}
                      {isToday && <View style={styles.todayIndicator} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            // Week view
            <View style={styles.weekRow}>
              {weekDays.map((date, i) => {
                const dateStr = toDateStr(date);
                const mood = moodByDate[dateStr];
                const config = mood ? getMoodConfig(mood) : null;
                const isSelected = dateStr === selectedDate;
                const isToday = isSameDate(date, today);

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.weekDayCol,
                      isSelected && {
                        backgroundColor: Colors.primaryLight,
                        borderRadius: 14,
                      },
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                  >
                    <Text
                      style={[
                        styles.weekDayName,
                        isToday && { color: Colors.primary, fontWeight: "700" },
                      ]}
                    >
                      {date
                        .toLocaleDateString("en-US", { weekday: "short" })
                        .slice(0, 1)}
                    </Text>
                    <Text
                      style={[
                        styles.weekDayNum,
                        isToday && { color: Colors.primary, fontWeight: "700" },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    {config ? (
                      <Text style={styles.weekEmoji}>{config.emoji}</Text>
                    ) : (
                      <View style={styles.weekEmpty} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Selected Date Entries */}
        <SectionHeader
          title={
            selectedDate === toDateStr(today)
              ? "Today's Entries"
              : new Date(selectedDate + "T12:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  },
                )
          }
        />
        {selectedEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No entries</Text>
            <Text style={styles.emptySub}>No mood logged for this day</Text>
          </View>
        ) : (
          selectedEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))
        )}

        {/* All Recent Entries */}
        <View style={styles.entriesHeader}>
          <Text style={styles.entriesTitle}>All Entries</Text>
          <View style={styles.entriesToggle}>
            {(["detailed", "compact"] as EntryViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.entriesToggleBtn,
                  entryViewMode === mode && styles.entriesToggleBtnActive,
                ]}
                onPress={() => setEntryViewMode(mode)}
              >
                <Text
                  style={[
                    styles.entriesToggleBtnText,
                    entryViewMode === mode && styles.entriesToggleBtnTextActive,
                  ]}
                >
                  {mode === "detailed" ? "Detailed" : "Compact"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {displayedEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Start logging your mood daily</Text>
          </View>
        ) : (
          <>
            {displayedEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                showDate
                compact={entryViewMode === "compact"}
              />
            ))}
            {!showAll && entries.length > recentEntries.length ? (
              <TouchableOpacity
                style={styles.showAllBtn}
                onPress={() => setShowAll(true)}
              >
                <Text style={styles.showAllText}>Show all entries</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },

  toggle: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: { color: "#fff" },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 22, color: Colors.primary, fontWeight: "600" },
  monthTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },

  dayHeaders: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayHeaderText: {
    width: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },

  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 2,
  },
  moodDot: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  calEmoji: { fontSize: 18 },
  calDayNum: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  todayIndicator: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },

  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekDayCol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 4,
  },
  weekDayName: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  weekDayNum: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  weekEmoji: { fontSize: 20 },
  weekEmpty: { width: 20, height: 20 },

  emptyState: { alignItems: "center", paddingVertical: 24, gap: 6 },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary },
  showAllBtn: {
    marginTop: 14,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  showAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  entriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  entriesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  entriesToggle: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  entriesToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  entriesToggleBtnActive: { backgroundColor: Colors.primary },
  entriesToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  entriesToggleBtnTextActive: { color: "#fff" },
});
