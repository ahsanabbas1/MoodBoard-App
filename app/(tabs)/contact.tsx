import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function ContactScreen() {
  const router = useRouter();

  async function handleEmail() {
    const url = 'mailto:ahsanabbas1991@gmail.com?subject=MoodBoard%20Feedback';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Email', 'ahsanabbas1991@gmail.com');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AA</Text>
          </View>
          <Text style={styles.name}>Ahsan Abbas</Text>
          <Text style={styles.role}>Developer & Creator</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <Text style={styles.blurb}>
            Have feedback, a bug report, or a feature request? I'd love to hear from you!
          </Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.contactRow} onPress={handleEmail} activeOpacity={0.7}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={20} color={Colors.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>ahsanabbas1991@gmail.com</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.noteText}>
            I typically respond within 1–2 business days.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  role: { fontSize: 14, color: Colors.textSecondary },
  section: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  blurb: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
