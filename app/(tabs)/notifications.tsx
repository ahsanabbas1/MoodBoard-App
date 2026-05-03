import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

type Tab = 'all' | 'suggestions';

interface NotificationItem {
  id: string;
  type: 'reminder' | 'warning' | 'summary' | 'achievement' | 'insight';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

interface SuggestionItem {
  id: string;
  title: string;
  body: string;
}

const ALL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'reminder',
    title: 'Remember to log your mood today',
    body: "You haven't logged yet — take 30 seconds to check in with yourself.",
    time: 'Today, 9:00 AM',
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: "You haven't logged for 3 days",
    body: 'Consistency helps you spot patterns. Tap here to log now.',
    time: '3 days ago',
    read: false,
  },
  {
    id: '3',
    type: 'summary',
    title: 'Your weekly summary is ready',
    body: 'See how your mood trended over the past 7 days on the Insights page.',
    time: '5 days ago',
    read: true,
  },
  {
    id: '4',
    type: 'achievement',
    title: "Great job! You've been consistent 🔥",
    body: "You've logged your mood 7 days in a row. Keep the streak alive!",
    time: '1 week ago',
    read: true,
  },
  {
    id: '5',
    type: 'insight',
    title: 'Mood pattern detected',
    body: 'Your mood tends to dip on Mondays. Consider a self-care routine to start the week strong.',
    time: '1 week ago',
    read: true,
  },
];

const SUGGESTIONS: SuggestionItem[] = [
  {
    id: 's1',
    title: 'Log in the morning for better accuracy',
    body: 'Morning entries tend to reflect the day ahead with more clarity. Try logging within 30 minutes of waking.',
  },
  {
    id: 's2',
    title: 'Add tags to uncover what drives your mood',
    body: 'Entries with tags reveal patterns over time — like how exercise or sleep affects your score.',
  },
  {
    id: 's3',
    title: 'Write a short note with each entry',
    body: 'Even one sentence gives context to your mood data and makes your history more meaningful to review.',
  },
  {
    id: 's4',
    title: 'Review your Insights weekly',
    body: 'Spending 2 minutes each week on your Insights page helps you stay aware of emotional trends.',
  },
];

const TYPE_CONFIG: Record<
  NotificationItem['type'],
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  reminder: { icon: 'notifications', color: Colors.primary, bg: Colors.primaryLight },
  warning:  { icon: 'alert-circle',   color: '#F97316',    bg: '#FFF7ED' },
  summary:  { icon: 'bar-chart',      color: '#3B82F6',    bg: '#EFF6FF' },
  achievement: { icon: 'trophy',      color: '#10B981',    bg: '#ECFDF5' },
  insight:  { icon: 'bulb',           color: '#8B5CF6',    bg: '#F5F3FF' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadHint}>{unreadCount} unread</Text>
            )}
          </View>
          <View style={styles.bellWrap}>
            <Ionicons name="notifications" size={22} color={Colors.primary} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['all', 'suggestions'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'all' ? 'All' : 'Suggestions'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'all' ? (
          <>
            {/* Recent Notifications */}
            <Text style={styles.sectionLabel}>Recent</Text>
            <View style={styles.notifList}>
              {notifications.map((item) => {
                const cfg = TYPE_CONFIG[item.type];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notifCard, item.read && styles.notifCardRead]}
                    activeOpacity={0.78}
                    onPress={() => markRead(item.id)}
                  >
                    <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                    </View>
                    <View style={styles.notifBody}>
                      <Text style={[styles.notifTitle, item.read && styles.notifTitleRead]}>
                        {item.title}
                      </Text>
                      <Text style={styles.notifDesc} numberOfLines={2}>
                        {item.body}
                      </Text>
                      <Text style={styles.notifTime}>{item.time}</Text>
                    </View>
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* AI Suggestion Card */}
            <AISuggestionCard
              title="Your mood improves after social activity"
              body="Based on your recent entries, moods tagged with Friends or Family average 1.2 points above your baseline. Try to schedule social time when you're feeling low."
            />
          </>
        ) : (
          <>
            {/* Suggestions tab */}
            <Text style={styles.sectionLabel}>Smart Tips</Text>
            <View style={styles.notifList}>
              {SUGGESTIONS.map((s) => (
                <View key={s.id} style={styles.suggestionCard}>
                  <View style={[styles.notifIcon, { backgroundColor: Colors.primaryLight }]}>
                    <Ionicons name="bulb" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.notifBody}>
                    <Text style={styles.notifTitle}>{s.title}</Text>
                    <Text style={styles.notifDesc}>{s.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* AI Suggestion Card */}
            <AISuggestionCard
              title="Wednesdays are your best days"
              body="Your mood data shows a consistent peak mid-week. Consider planning challenging tasks or important conversations on Wednesdays when your emotional energy is highest."
            />
          </>
        )}

        {/* Notification Settings Link */}
        <TouchableOpacity
          style={styles.settingsRow}
          activeOpacity={0.75}
          onPress={() => router.push('/profile')}
        >
          <View style={[styles.notifIcon, { backgroundColor: Colors.border }]}>
            <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
          </View>
          <Text style={styles.settingsLabel}>Notification Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function AISuggestionCard({ title, body }: { title: string; body: string }) {
  return (
    <LinearGradient
      colors={['#7C6FFF', '#A78BFA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.aiCard}
    >
      <View style={styles.aiCardHeader}>
        <View style={styles.aiCardBadge}>
          <Ionicons name="sparkles" size={12} color="#7C6FFF" />
          <Text style={styles.aiCardBadgeText}>AI Suggestion</Text>
        </View>
      </View>
      <Text style={styles.aiCardTitle}>{title}</Text>
      <Text style={styles.aiCardBody}>{body}</Text>
      <Text style={styles.aiCardFooter}>Dynamic insights coming soon</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  unreadHint: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  bellWrap: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  notifList: { gap: 10 },

  notifCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notifCardRead: { opacity: 0.7 },

  suggestionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },

  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  notifTitleRead: { fontWeight: '500', color: Colors.textSecondary },
  notifDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  notifTime: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
    flexShrink: 0,
  },

  // AI card
  aiCard: {
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  aiCardHeader: { flexDirection: 'row' },
  aiCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  aiCardBadgeText: { fontSize: 10, fontWeight: '700', color: '#7C6FFF' },
  aiCardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 21 },
  aiCardBody: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  aiCardFooter: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Settings link
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
