import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useMood } from '../../store/MoodContext';
import { getMoodConfig } from '../../constants/Moods';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { entries, deleteEntry } = useMood();

  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Entry not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = getMoodConfig(entry.mood);

  const formattedDate = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handleDelete() {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this mood entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entry.id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mood Hero */}
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEmoji}>{config.emoji}</Text>
          <Text style={styles.heroMood}>{config.label}</Text>
          <Text style={styles.heroDate}>{formattedDate}</Text>
          <Text style={styles.heroTime}>Logged at {entry.time}</Text>
        </LinearGradient>

        {/* Mood Level Indicator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mood Level</Text>
          <View style={styles.moodScale}>
            {[1, 2, 3, 4, 5].map((level) => (
              <View
                key={level}
                style={[
                  styles.scalePip,
                  {
                    backgroundColor: level <= entry.mood ? config.color : Colors.border,
                    transform: [{ scale: level === entry.mood ? 1.3 : 1 }],
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.moodLevelText, { color: config.color }]}>
            {entry.mood}/5 — {config.label}
          </Text>
        </View>

        {/* Note */}
        {entry.note ? (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="document-text" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Note</Text>
            </View>
            <Text style={styles.noteText}>{entry.note}</Text>
          </View>
        ) : null}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="pricetag" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>What influenced this mood</Text>
            </View>
            <View style={styles.tagsWrap}>
              {entry.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={styles.deleteBtnText}>Delete Entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { gap: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16, color: Colors.textSecondary },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },

  hero: {
    padding: 32,
    alignItems: 'center',
    gap: 6,
  },
  heroEmoji: { fontSize: 56 },
  heroMood: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroDate: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  heroTime: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  moodScale: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  scalePip: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  moodLevelText: { fontSize: 14, fontWeight: '600' },

  noteText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
  },
  tagText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
