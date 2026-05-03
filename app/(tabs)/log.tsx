import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Colors } from "../../constants/Colors";
import { MOODS, TAGS } from "../../constants/Moods";
import { useMood } from "../../store/MoodContext";
import { MoodLevel } from "../../types";

export default function LogScreen() {
  const router = useRouter();
  const { addEntry, getTodayEntry } = useMood();

  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const todayEntry = getTodayEntry();

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function handleSave() {
    if (!selectedMood) {
      Alert.alert("Select a mood", "Please choose how you are feeling today.");
      return;
    }

    if (todayEntry) {
      Alert.alert(
        "Already logged today",
        "You've already logged your mood today. Would you like to add another entry?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add anyway", onPress: save },
        ],
      );
      return;
    }

    await save();
  }

  async function save() {
    setSaving(true);
    const normalizedIntensity = Math.min(10, Math.max(0, intensity));
    await addEntry(
      selectedMood!,
      normalizedIntensity,
      note.trim(),
      selectedTags,
    );
    setSaving(false);
    setSelectedMood(null);
    setIntensity(5);
    setNote("");
    setSelectedTags([]);
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>How are you{"\n"}feeling today?</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          {/* Mood Selector */}
          <View style={styles.moodGrid}>
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood.level;
              return (
                <TouchableOpacity
                  key={mood.level}
                  style={[
                    styles.moodOption,
                    isSelected && { borderColor: mood.color, borderWidth: 2.5 },
                    {
                      backgroundColor: isSelected ? mood.bgColor : Colors.card,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setSelectedMood(mood.level as MoodLevel)}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={mood.gradientColors}
                      style={styles.moodSelectedOverlay}
                    />
                  )}
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text
                    style={[
                      styles.moodLabel,
                      { color: isSelected ? mood.color : Colors.textSecondary },
                    ]}
                  >
                    {mood.label}
                  </Text>
                  {isSelected && (
                    <View
                      style={[
                        styles.checkmark,
                        { backgroundColor: mood.color },
                      ]}
                    >
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Intensity Slider */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Mood Intensity</Text>
              <View style={styles.intensityBadge}>
                <Text style={styles.intensityBadgeText}>{intensity}/10</Text>
              </View>
            </View>
            <View style={styles.sliderWrapper}>
              <LinearGradient
                colors={["#EF4444", "#EAB308", "#22C55E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sliderGradient}
              />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={intensity}
                onValueChange={setIntensity}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor={Colors.primary}
              />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Dull</Text>
              <Text style={styles.sliderLabel}>Bright</Text>
            </View>
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Add a note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="What's on your mind? How was your day?"
              placeholderTextColor={Colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{note.length}/500</Text>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What influenced your mood?</Text>
            <View style={styles.tagsGrid}>
              {TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      active && {
                        backgroundColor: Colors.primaryLight,
                        borderColor: Colors.primary,
                      },
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        {
                          color: active ? Colors.primary : Colors.textSecondary,
                        },
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, !selectedMood && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            <LinearGradient
              colors={
                selectedMood ? ["#7C6FFF", "#9F97FF"] : ["#D1D5DB", "#D1D5DB"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              {saving ? (
                <Text style={styles.saveBtnText}>Saving…</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Mood</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 24 },

  header: { paddingTop: 16, gap: 6 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subtitle: { fontSize: 15, color: Colors.textSecondary },

  moodGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  moodOption: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: "hidden",
    position: "relative",
    gap: 4,
    padding: 6,
  },
  moodSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  moodEmoji: { fontSize: 30 },
  moodLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  intensityBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  intensityBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },

  sliderWrapper: {
    height: 44,
    justifyContent: "center",
  },
  sliderGradient: {
    height: 14,
    borderRadius: 7,
    position: "absolute",
    left: 4,
    right: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  slider: {
    width: "100%",
    height: 44,
    transform: [{ scaleY: 1.8 }],
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },

  noteInput: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "right",
    marginTop: -4,
  },

  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tagChipText: { fontSize: 13, fontWeight: "500" },

  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnGradient: {
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
});
