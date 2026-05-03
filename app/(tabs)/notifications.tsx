import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const notifications = [
  { id: "1", title: "New login from Chrome", time: "2h ago" },
  { id: "2", title: "Family event reminder", time: "1d ago" },
  { id: "3", title: "Weekly mood summary ready", time: "3d ago" },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Ionicons name="notifications" size={24} color={Colors.primary} />
        </View>

        {notifications.map((notification) => (
          <View key={notification.id} style={styles.card}>
            <View>
              <Text style={styles.cardTitle}>{notification.title}</Text>
              <Text style={styles.cardTime}>{notification.time}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.textMuted}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: Colors.textPrimary },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  cardTime: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
});
