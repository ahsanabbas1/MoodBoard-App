import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Colors } from "../../constants/Colors";

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* App identity */}
        <View style={styles.heroCard}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconEmoji}>🧠</Text>
          </View>
          <Text style={styles.appName}>MoodBoard</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appTagline}>
            Track your mood, understand patterns, and share with family.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What MoodBoard Does</Text>
          <View style={styles.card}>
            {[
              {
                icon: "happy-outline",
                text: "Log your daily mood with emoji-based tracking",
              },
              {
                icon: "bar-chart-outline",
                text: "Visualise mood patterns and streaks over time",
              },
              {
                icon: "bulb-outline",
                text: "Get AI-powered insights about your emotional health",
              },
              {
                icon: "people-outline",
                text: "Share mood trends with family and friends",
              },
              {
                icon: "notifications-outline",
                text: "Stay consistent with smart reminders",
              },
            ].map((item, i) => (
              <View
                key={i}
                style={[styles.featureRow, i > 0 && styles.featureRowBorder]}
              >
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Built with */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Built With</Text>
          <View style={styles.card}>
            {[
              { label: 'Framework', value: 'React Native / Expo' },
              { label: 'Backend', value: 'Supabase' },
              { label: 'Database', value: 'SQLite (local) + PostgreSQL' },
              { label: 'AI Insights', value: 'Claude (Anthropic)' },
            ].map((item, i) => (
              <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View> */}

        <Text style={styles.copyright}>
          © 2025 MoodBoard. All rights reserved.
        </Text>
        <Text style={styles.madeWith}>
          Made with ❤️ for your mental wellness
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  content: { padding: 20, gap: 24, paddingBottom: 48 },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#EEF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appIconEmoji: { fontSize: 40 },
  appName: { fontSize: 26, fontWeight: "800", color: Colors.textPrimary },
  appVersion: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },
  appTagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  copyright: { textAlign: "center", fontSize: 12, color: Colors.textMuted },
  madeWith: { textAlign: "center", fontSize: 13, color: Colors.textSecondary },
});
