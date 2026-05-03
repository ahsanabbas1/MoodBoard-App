import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../constants/Colors";
import { getMoodConfig } from "../constants/Moods";
import { MoodEntry } from "../types";
import MoodBadge from "./MoodBadge";

interface Props {
  entry: MoodEntry;
  showDate?: boolean;
  compact?: boolean;
}

export default function EntryCard({
  entry,
  showDate = false,
  compact = false,
}: Props) {
  const router = useRouter();
  const config = getMoodConfig(entry.mood);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/entry/${entry.id}` as any)}
    >
      <View style={[styles.accentBar, { backgroundColor: config.color }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <MoodBadge mood={entry.mood} size="sm" />
          <View style={styles.meta}>
            <Text style={styles.moodLabel}>{config.label}</Text>
            <Text style={styles.time}>
              {showDate ? formatDate(entry.date) : ""}
              {showDate && entry.time ? " · " : ""}
              {entry.time}
            </Text>
          </View>
        </View>
        {!compact && entry.note ? (
          <Text style={styles.note} numberOfLines={2}>
            {entry.note}
          </Text>
        ) : null}
        {!compact && entry.tags.length > 0 && (
          <View style={styles.tags}>
            {entry.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {entry.tags.length > 3 && (
              <Text style={styles.moreTags}>+{entry.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  meta: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  note: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  tag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "500",
  },
  moreTags: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
});
