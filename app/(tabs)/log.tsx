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
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Colors } from "../../constants/Colors";
import { useMood } from "../../store/MoodContext";
import { toDateString } from "../../utils/date";
import { CORE_TO_MOOD_LEVEL, EMOTION_WHEEL } from "../../constants/EmotionWheel";
import { MoodLevel } from "../../types";
import type { EmotionSelection } from "../../constants/EmotionWheel";
import EmotionWheelPicker from "../../components/EmotionWheelPicker";
import DatePickerModal from "../../components/DatePickerModal";
import TagSelector from "../../components/TagSelector";

export default function LogScreen() {
  const router = useRouter();
  const { addEntry, entries, getEntriesForDate } = useMood();

  const [selectedEmotion, setSelectedEmotion] = useState<EmotionSelection | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(toDateString());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isToday = selectedDate === toDateString();

  const loggedDates = useMemo(
    () => new Set(entries.map((e) => e.date)),
    [entries],
  );

  const existingForDate = getEntriesForDate(selectedDate);

  // ── Derived display values ──────────────────────────────────────────────────

  const selectedCore = selectedEmotion
    ? EMOTION_WHEEL.find((c) => c.label === selectedEmotion.core)
    : null;

  const intensityLabel = useMemo(() => {
    if (intensity <= 2) return 'Very mild';
    if (intensity <= 4) return 'Mild';
    if (intensity <= 6) return 'Moderate';
    if (intensity <= 8) return 'Strong';
    return 'Very intense';
  }, [intensity]);

  const dateDisplayLabel = useMemo(() => {
    if (isToday) return 'Today';
    const d = new Date(selectedDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [selectedDate, isToday]);

  // ── Save logic ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedEmotion) {
      Alert.alert("Select an emotion", "Please tap the wheel to choose how you are feeling.");
      return;
    }

    if (existingForDate.length > 0) {
      Alert.alert(
        "Already logged",
        `You already have ${existingForDate.length === 1 ? 'an entry' : 'entries'} for ${isToday ? 'today' : dateDisplayLabel}. Add another?`,
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
    const moodLevel = (CORE_TO_MOOD_LEVEL[selectedEmotion!.core] ?? 3) as MoodLevel;
    const normalizedIntensity = Math.min(10, Math.max(0, intensity));

    await addEntry(
      moodLevel,
      normalizedIntensity,
      note.trim(),
      selectedTags,
      selectedEmotion!.label,
      selectedEmotion!.core,
      selectedEmotion!.emoji,
      selectedDate,
    );

    setSaving(false);
    setSelectedEmotion(null);
    setIntensity(5);
    setNote("");
    setSelectedTags([]);
    setSelectedDate(toDateString());
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
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {isToday
                    ? `How are you\nfeeling today?`
                    : `How were you\nfeeling on ${dateDisplayLabel}?`}
                </Text>
              </View>
              {/* Date chip */}
              <TouchableOpacity
                style={[styles.dateChip, !isToday && styles.dateChipPast]}
                onPress={() => setDatePickerOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={isToday ? Colors.textSecondary : Colors.primary}
                />
                <Text style={[styles.dateChipText, !isToday && styles.dateChipTextPast]}>
                  {dateDisplayLabel}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color={isToday ? Colors.textMuted : Colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Emotion Wheel ────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>How do you feel?</Text>
            <Text style={styles.sectionHint}>
              Tap any ring — inner for broad, outer for detailed
            </Text>
            <View style={styles.wheelContainer}>
              <EmotionWheelPicker
                selection={selectedEmotion}
                onSelect={setSelectedEmotion}
              />
            </View>
            {selectedEmotion && (
              <View style={[styles.selectionCard, { borderColor: selectedCore?.color ?? Colors.border }]}>
                <Text style={styles.selectionEmoji}>{selectedEmotion.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectionLabel, { color: selectedCore?.color }]}>
                    {selectedEmotion.label}
                  </Text>
                  {selectedEmotion.label !== selectedEmotion.core && (
                    <Text style={styles.selectionCore}>{selectedEmotion.core}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedEmotion(null)}>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Intensity Slider ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Intensity</Text>
              <View style={[styles.intensityBadge, { backgroundColor: selectedCore?.color ?? Colors.primaryLight }]}>
                <Text style={styles.intensityBadgeText}>{intensity}/10 · {intensityLabel}</Text>
              </View>
            </View>
            <View style={styles.sliderWrapper}>
              <LinearGradient
                colors={
                  selectedCore
                    ? [selectedCore.terColor, selectedCore.secColor, selectedCore.color]
                    : ["#EF4444", "#EAB308", "#22C55E"]
                }
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
                thumbTintColor={selectedCore?.color ?? Colors.primary}
              />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Mild</Text>
              <Text style={styles.sliderLabel}>Intense</Text>
            </View>
          </View>

          {/* ── Note ─────────────────────────────────────────────────────────── */}
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

          {/* ── Tags ─────────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What influenced your mood?</Text>
            <TagSelector selected={selectedTags} onChange={setSelectedTags} />
          </View>

          {/* ── Save Button ───────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, !selectedEmotion && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            <LinearGradient
              colors={
                selectedEmotion && selectedCore
                  ? [selectedCore.color, selectedCore.secColor]
                  : selectedEmotion
                    ? ["#7C6FFF", "#9F97FF"]
                    : ["#D1D5DB", "#D1D5DB"]
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
                  <Text style={styles.saveBtnText}>
                    {isToday ? 'Save Mood' : `Save for ${dateDisplayLabel}`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Date Picker Modal ─────────────────────────────────────────────────── */}
      <DatePickerModal
        visible={datePickerOpen}
        selectedDate={selectedDate}
        loggedDates={loggedDates}
        onSelect={setSelectedDate}
        onClose={() => setDatePickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 24 },

  header: { paddingTop: 16, gap: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 4,
  },
  dateChipPast: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dateChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  dateChipTextPast: { color: Colors.primary },

  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  sectionHint: { fontSize: 12, color: Colors.textMuted, marginTop: -4 },

  wheelContainer: { alignItems: 'center', marginVertical: 4 },

  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 2,
  },
  selectionEmoji: { fontSize: 24 },
  selectionLabel: { fontSize: 15, fontWeight: '700' },
  selectionCore: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  intensityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  intensityBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  sliderWrapper: { height: 44, justifyContent: "center" },
  sliderGradient: {
    height: 14,
    borderRadius: 7,
    position: "absolute",
    left: 4,
    right: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  slider: { width: "100%", height: 44, transform: [{ scaleY: 1.8 }] },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  sliderLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },

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
  charCount: { fontSize: 12, color: Colors.textMuted, textAlign: "right", marginTop: -4 },

  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnGradient: {
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
});
