import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";

export default function MoreScreen() {
  const router = useRouter();

  const items = [
    {
      label: "Notifications",
      icon: "notifications",
      route: "/(tabs)/notifications",
    },
    { label: "Family", icon: "people", route: "/(tabs)/family" },
    { label: "Profile", icon: "person", route: "/(tabs)/profile" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>
          Quick access to notifications, family, and profile.
        </Text>

        {items.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.card}
            onPress={() => router.push(item.route)}
          >
            <View style={styles.iconBox}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
