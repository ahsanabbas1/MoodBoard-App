import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { useMood } from '../../store/MoodContext';
import { useAuth } from '../../store/AuthContext';
import { getMoodConfig, MOODS } from '../../constants/Moods';
import { MoodLevel } from '../../types';
import { toDateString } from '../../utils/date';
import {
  getPendingRequests,
  respondToRequest,
  FriendRequest,
} from '../../services/friendRequestService';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'activity' | 'reminders' | 'tips';

type NotifType = 'reminder' | 'streak' | 'warning' | 'summary' | 'achievement' | 'insight' | 'milestone';

interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: number;   // Unix ms — real time, not hardcoded strings
  read: boolean;
  actionRoute?: string;
}

interface ReminderSettings {
  dailyReminder: boolean;
  reminderTime: string;    // "HH:MM"
  streakAlerts: boolean;
  weeklyDigest: boolean;
  insightAlerts: boolean;
  achievementAlerts: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Per-user keys so data never leaks to the next account on sign-out
const skNotifs    = (uid: string) => `notifications_v1_${uid}`;
const skReminders = (uid: string) => `reminder_settings_v1_${uid}`;

const TYPE_CONFIG: Record<NotifType, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  label: string;
}> = {
  reminder:    { icon: 'time-outline',          color: Colors.primary,  bg: Colors.primaryLight, label: 'Reminder' },
  streak:      { icon: 'flame',                 color: '#F97316',       bg: '#FFF7ED',           label: 'Streak' },
  warning:     { icon: 'alert-circle-outline',  color: '#EF4444',       bg: '#FEF2F2',           label: 'Alert' },
  summary:     { icon: 'bar-chart-outline',     color: '#3B82F6',       bg: '#EFF6FF',           label: 'Summary' },
  achievement: { icon: 'trophy-outline',        color: '#10B981',       bg: '#ECFDF5',           label: 'Achievement' },
  insight:     { icon: 'bulb-outline',          color: '#8B5CF6',       bg: '#F5F3FF',           label: 'Insight' },
  milestone:   { icon: 'star-outline',          color: '#F59E0B',       bg: '#FFFBEB',           label: 'Milestone' },
};

const TIPS = [
  {
    id: 't1',
    icon: 'sunny-outline' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    title: 'Log in the morning',
    body: 'Morning entries reflect your day ahead with clarity. Try logging within 30 minutes of waking up for the most accurate baseline.',
  },
  {
    id: 't2',
    icon: 'pricetag-outline' as const,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    title: 'Use tags to find patterns',
    body: 'Entries with tags like Exercise, Sleep, or Work reveal what drives your mood over time. Tag consistently for the best insights.',
  },
  {
    id: 't3',
    icon: 'create-outline' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
    title: 'Write a short note',
    body: 'Even one sentence gives context to your mood. Your future self will thank you when reviewing history.',
  },
  {
    id: 't4',
    icon: 'bar-chart-outline' as const,
    color: '#10B981',
    bg: '#ECFDF5',
    title: 'Review Insights weekly',
    body: '2 minutes on your Insights page each week helps you spot emotional trends before they become problems.',
  },
  {
    id: 't5',
    icon: 'people-outline' as const,
    color: '#F97316',
    bg: '#FFF7ED',
    title: 'Share with trusted people',
    body: 'Adding family or friends to your circle and comparing moods builds emotional connection and accountability.',
  },
  {
    id: 't6',
    icon: 'moon-outline' as const,
    color: '#6366F1',
    bg: '#EEF2FF',
    title: 'Log before bed too',
    body: 'A bedtime log captures how the day actually unfolded vs how you expected it to — great for spotting surprises.',
  },
];

const DEFAULT_REMINDERS: ReminderSettings = {
  dailyReminder:     true,
  reminderTime:      '09:00',
  streakAlerts:      true,
  weeklyDigest:      true,
  insightAlerts:     true,
  achievementAlerts: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Generate real notifications from live mood data */
function buildNotifications(
  entries: ReturnType<typeof useMood>['entries'],
  streak: number,
  avgMood: number,
  stored: NotifItem[],
): NotifItem[] {
  const today = toDateString();
  const todayLogged = entries.some((e) => e.date === today);
  const generated: NotifItem[] = [];
  const now = Date.now();

  // Daily reminder — only if not yet logged today
  if (!todayLogged) {
    const existingReminder = stored.find((n) => n.type === 'reminder' && n.id === 'auto-daily');
    generated.push({
      id: 'auto-daily',
      type: 'reminder',
      title: "Haven't logged yet today",
      body: "Take 30 seconds to check in with yourself. Tap to log your mood now.",
      timestamp: existingReminder?.timestamp ?? now,
      read: existingReminder?.read ?? false,
      actionRoute: '/(tabs)/log',
    });
  }

  // Streak notifications
  if (streak >= 3) {
    const id = `auto-streak-${streak}`;
    const existing = stored.find((n) => n.id === id);
    generated.push({
      id,
      type: streak >= 7 ? 'achievement' : 'streak',
      title: streak >= 30
        ? `Incredible! ${streak}-day streak 🏆`
        : streak >= 7
        ? `${streak}-day streak — you're on fire! 🔥`
        : `${streak} days in a row — keep going! 🔥`,
      body: streak >= 7
        ? `You've logged your mood for ${streak} consecutive days. Consistency like this leads to real self-awareness.`
        : `You're building a great habit. Log again today to reach ${streak + 1} days.`,
      timestamp: existing?.timestamp ?? now,
      read: existing?.read ?? false,
      actionRoute: '/(tabs)/insights',
    });
  }

  // Warning — missed 3+ days
  const sortedDates = [...new Set(entries.map((e) => e.date))].sort().reverse();
  const lastDate = sortedDates[0];
  if (lastDate) {
    const daysMissed = Math.floor((Date.now() - new Date(lastDate + 'T12:00:00').getTime()) / 86_400_000);
    if (daysMissed >= 3) {
      const id = `auto-gap-${lastDate}`;
      const existing = stored.find((n) => n.id === id);
      generated.push({
        id,
        type: 'warning',
        title: `${daysMissed} days without logging`,
        body: "Gaps make it harder to spot patterns. It only takes 30 seconds — tap to log now.",
        timestamp: existing?.timestamp ?? now - daysMissed * 86_400_000,
        read: existing?.read ?? false,
        actionRoute: '/(tabs)/log',
      });
    }
  }

  // Weekly digest — if 7+ entries exist
  if (entries.length >= 7) {
    const id = 'auto-weekly-digest';
    const existing = stored.find((n) => n.id === id);
    const moodLabel = avgMood > 0 ? getMoodConfig(Math.round(avgMood) as MoodLevel).label : 'Neutral';
    generated.push({
      id,
      type: 'summary',
      title: 'Your 7-day mood summary',
      body: `Your average mood this week is "${moodLabel}". Head to Insights to see the full breakdown.`,
      timestamp: existing?.timestamp ?? now - 2 * 86_400_000,
      read: existing?.read ?? false,
      actionRoute: '/(tabs)/insights',
    });
  }

  // Milestone notifications
  const milestones = [10, 25, 50, 100, 200];
  for (const m of milestones) {
    if (entries.length >= m) {
      const id = `auto-milestone-${m}`;
      const existing = stored.find((n) => n.id === id);
      generated.push({
        id,
        type: 'milestone',
        title: `${m} mood entries logged! 🌟`,
        body: `You've tracked your mood ${m} times. That's serious self-awareness — keep it up!`,
        timestamp: existing?.timestamp ?? now - 7 * 86_400_000,
        read: existing?.read ?? false,
        actionRoute: '/(tabs)/insights',
      });
    }
  }

  // Insight — best day of week (needs 14+ entries)
  if (entries.length >= 14) {
    const dayTotals: Record<number, number[]> = {};
    entries.forEach((e) => {
      const d = new Date(e.date + 'T12:00:00').getDay();
      if (!dayTotals[d]) dayTotals[d] = [];
      dayTotals[d].push(e.mood);
    });
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDay = Object.entries(dayTotals)
      .map(([d, moods]) => ({ day: parseInt(d), avg: moods.reduce((s, m) => s + m, 0) / moods.length }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (bestDay) {
      const id = 'auto-best-day';
      const existing = stored.find((n) => n.id === id);
      generated.push({
        id,
        type: 'insight',
        title: `${dayNames[bestDay.day]}s are your best days`,
        body: `Your mood consistently peaks on ${dayNames[bestDay.day]}s (avg ${bestDay.avg.toFixed(1)}/6). Consider scheduling your most important activities then.`,
        timestamp: existing?.timestamp ?? now - 3 * 86_400_000,
        read: existing?.read ?? false,
        actionRoute: '/(tabs)/insights',
      });
    }
  }

  // Merge with any manually-kept user notifications from stored
  const autoIds = new Set(generated.map((g) => g.id));
  const manualStored = stored.filter((n) => !n.id.startsWith('auto-') && !autoIds.has(n.id));

  return [...generated, ...manualStored].sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router    = useRouter();
  const { user }  = useAuth();
  const { entries, getStreak, getAverageMood } = useMood();

  const streak  = getStreak();
  const avgMood = getAverageMood(7);

  const [activeTab, setActiveTab] = useState<Tab>('activity');
  const [storedNotifs, setStoredNotifs] = useState<NotifItem[]>([]);
  const [reminders, setReminders] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [loaded, setLoaded] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Load persisted read-state, reminder settings, and pending friend requests
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    setLoaded(false);
    (async () => {
      try {
        const [nb, rb] = await Promise.all([
          AsyncStorage.getItem(skNotifs(uid)),
          AsyncStorage.getItem(skReminders(uid)),
        ]);
        if (nb) setStoredNotifs(JSON.parse(nb));
        if (rb) setReminders(JSON.parse(rb));
      } catch {}
      setLoaded(true);
      // Load friend requests separately (network call)
      try {
        const requests = await getPendingRequests(uid);
        setFriendRequests(requests);
      } catch {}
    })();
  }, [user?.id]);

  // Persist reminder settings whenever they change
  useEffect(() => {
    if (!loaded || !user?.id) return;
    AsyncStorage.setItem(skReminders(user.id), JSON.stringify(reminders)).catch(() => {});
  }, [reminders, loaded]);

  // Build live notifications from mood data
  const notifications = useMemo(
    () => buildNotifications(entries, streak, avgMood, storedNotifs),
    [entries, streak, avgMood, storedNotifs],
  );

  const unreadCount = notifications.filter((n) => !n.read).length + friendRequests.length;

  const uid = user?.id ?? '';

  // Persist read-state changes
  function markRead(id: string) {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    const stored  = updated.map(({ id, read, timestamp }) => ({ id, read, timestamp }));
    setStoredNotifs(stored as NotifItem[]);
    if (uid) AsyncStorage.setItem(skNotifs(uid), JSON.stringify(stored)).catch(() => {});
  }

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    const stored  = updated.map(({ id, read, timestamp }) => ({ id, read, timestamp }));
    setStoredNotifs(stored as NotifItem[]);
    if (uid) AsyncStorage.setItem(skNotifs(uid), JSON.stringify(stored)).catch(() => {});
  }

  function dismissAll() {
    Alert.alert(
      'Clear all notifications',
      'This will clear the activity feed. Your mood data is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setStoredNotifs([]);
            if (uid) AsyncStorage.setItem(skNotifs(uid), '[]').catch(() => {});
          },
        },
      ],
    );
  }

  function handleNotifPress(item: NotifItem) {
    markRead(item.id);
    if (item.actionRoute) router.push(item.actionRoute as any);
  }

  async function handleFriendRequestResponse(request: FriendRequest, status: 'accepted' | 'rejected') {
    try {
      await respondToRequest(request.id, status);
      setFriendRequests((prev) => prev.filter((r) => r.id !== request.id));
      if (status === 'accepted') {
        Alert.alert('Connected!', `You are now connected with ${request.senderProfile?.fullName || 'this user'} as ${request.relationshipType}. They will appear in your ${request.relationshipType === 'family' ? 'Family' : 'Friends'} circle.`);
      }
    } catch {
      Alert.alert('Error', 'Could not process the request. Please try again.');
    }
  }

  function toggleReminder(key: keyof ReminderSettings) {
    setReminders((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // AI insight card — derived from real data
  const aiInsight = useMemo(() => {
    if (entries.length < 5) return null;
    const tagCounts: Record<string, { count: number; moodSum: number }> = {};
    entries.forEach((e) => {
      e.tags.forEach((t) => {
        if (!tagCounts[t]) tagCounts[t] = { count: 0, moodSum: 0 };
        tagCounts[t].count++;
        tagCounts[t].moodSum += e.mood;
      });
    });
    const topTag = Object.entries(tagCounts)
      .filter(([, v]) => v.count >= 2)
      .map(([tag, v]) => ({ tag, avg: v.moodSum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (!topTag) return null;
    const overall = avgMood;
    const diff = (topTag.avg - overall).toFixed(1);
    const positive = topTag.avg > overall;
    return {
      title: positive
        ? `"${topTag.tag}" boosts your mood by +${diff}`
        : `"${topTag.tag}" correlates with lower mood`,
      body: positive
        ? `Across ${topTag.count} entries tagged with "${topTag.tag}", your average mood is ${topTag.avg.toFixed(1)}/6 — ${diff} points above your baseline of ${overall.toFixed(1)}. Try scheduling more of it.`
        : `Entries tagged "${topTag.tag}" average ${topTag.avg.toFixed(1)}/6 vs your baseline of ${overall.toFixed(1)}. This pattern may be worth exploring in a journal note.`,
    };
  }, [entries, avgMood]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadHint}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && activeTab === 'activity' && (
            <TouchableOpacity style={styles.headerBtn} onPress={markAllRead}>
              <Text style={styles.headerBtnText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <View style={styles.bellWrap}>
            <Ionicons name="notifications" size={22} color={Colors.primary} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          { key: 'activity',  label: 'Activity' },
          { key: 'reminders', label: 'Reminders' },
          { key: 'tips',      label: 'Tips' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {label}
            </Text>
            {key === 'activity' && unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ACTIVITY TAB ── */}
        {activeTab === 'activity' && (
          <>
            {/* Friend / Family Requests */}
            {friendRequests.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Connection Requests</Text>
                <View style={styles.notifList}>
                  {friendRequests.map((req) => (
                    <View key={req.id} style={styles.requestCard}>
                      <View style={styles.requestLeft}>
                        <View style={styles.requestAvatar}>
                          <Text style={styles.requestAvatarText}>
                            {(req.senderProfile?.fullName || 'U').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestName}>{req.senderProfile?.fullName || 'Unknown'}</Text>
                          <Text style={styles.requestSub}>
                            wants to add you as {req.relationshipType === 'family' ? 'Family' : 'a Friend'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.requestAccept}
                          onPress={() => handleFriendRequestResponse(req, 'accepted')}
                        >
                          <Text style={styles.requestAcceptText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.requestDecline}
                          onPress={() => handleFriendRequestResponse(req, 'rejected')}
                        >
                          <Text style={styles.requestDeclineText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-off-outline" size={32} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptyBody}>
                  Log your mood daily to start seeing streak alerts, insights, and summaries here.
                </Text>
              </View>
            ) : (
              <>
                {/* AI insight card — only when data is available */}
                {aiInsight && (
                  <LinearGradient
                    colors={['#7C3AED', '#A78BFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiCard}
                  >
                    <View style={styles.aiCardBadge}>
                      <Ionicons name="sparkles" size={11} color="#7C3AED" />
                      <Text style={styles.aiCardBadgeText}>AI Insight · Based on your data</Text>
                    </View>
                    <Text style={styles.aiCardTitle}>{aiInsight.title}</Text>
                    <Text style={styles.aiCardBody}>{aiInsight.body}</Text>
                  </LinearGradient>
                )}

                {/* Unread section */}
                {notifications.filter((n) => !n.read).length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>New</Text>
                    <View style={styles.notifList}>
                      {notifications
                        .filter((n) => !n.read)
                        .map((item) => (
                          <NotifCard key={item.id} item={item} onPress={handleNotifPress} />
                        ))}
                    </View>
                  </>
                )}

                {/* Read section */}
                {notifications.filter((n) => n.read).length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Earlier</Text>
                    <View style={styles.notifList}>
                      {notifications
                        .filter((n) => n.read)
                        .map((item) => (
                          <NotifCard key={item.id} item={item} onPress={handleNotifPress} />
                        ))}
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.clearRow} onPress={dismissAll}>
                  <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.clearText}>Clear all notifications</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ── REMINDERS TAB ── */}
        {activeTab === 'reminders' && (
          <>
            {/* Stats snapshot */}
            <View style={styles.statsRow}>
              <StatCard
                icon="flame"
                color="#F97316"
                bg="#FFF7ED"
                value={String(streak)}
                label="Day streak"
              />
              <StatCard
                icon="checkmark-circle"
                color="#10B981"
                bg="#ECFDF5"
                value={String(entries.length)}
                label="Total logs"
              />
              <StatCard
                icon="bar-chart"
                color="#3B82F6"
                bg="#EFF6FF"
                value={avgMood > 0 ? getMoodConfig(Math.round(avgMood) as MoodLevel).emoji : '—'}
                label="7-day avg"
              />
            </View>

            {/* Reminder settings */}
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Daily Check-in</Text>
              <SettingRow
                icon="alarm-outline"
                color={Colors.primary}
                bg={Colors.primaryLight}
                label="Daily reminder"
                sublabel="Get nudged to log your mood every day"
                value={reminders.dailyReminder}
                onToggle={() => toggleReminder('dailyReminder')}
              />
              {reminders.dailyReminder && (
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                  <Text style={styles.timeLabel}>Reminder time</Text>
                  <TouchableOpacity
                    style={styles.timeChip}
                    onPress={() =>
                      Alert.alert(
                        'Change Time',
                        'Open your device notification settings to set a custom time.',
                        [{ text: 'OK' }],
                      )
                    }
                  >
                    <Text style={styles.timeChipText}>{reminders.reminderTime}</Text>
                    <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Alerts</Text>
              <SettingRow
                icon="flame-outline"
                color="#F97316"
                bg="#FFF7ED"
                label="Streak alerts"
                sublabel="Be notified when your streak hits milestones"
                value={reminders.streakAlerts}
                onToggle={() => toggleReminder('streakAlerts')}
              />
              <View style={styles.divider} />
              <SettingRow
                icon="star-outline"
                color="#F59E0B"
                bg="#FFFBEB"
                label="Achievement alerts"
                sublabel="Celebrate milestones like 10, 50, 100 entries"
                value={reminders.achievementAlerts}
                onToggle={() => toggleReminder('achievementAlerts')}
              />
              <View style={styles.divider} />
              <SettingRow
                icon="bulb-outline"
                color="#8B5CF6"
                bg="#F5F3FF"
                label="Insight alerts"
                sublabel="Mood patterns detected from your history"
                value={reminders.insightAlerts}
                onToggle={() => toggleReminder('insightAlerts')}
              />
              <View style={styles.divider} />
              <SettingRow
                icon="bar-chart-outline"
                color="#3B82F6"
                bg="#EFF6FF"
                label="Weekly digest"
                sublabel="A summary of your mood trends every Sunday"
                value={reminders.weeklyDigest}
                onToggle={() => toggleReminder('weeklyDigest')}
              />
            </View>

            <TouchableOpacity
              style={styles.settingsLinkRow}
              onPress={() => router.push('/(tabs)/profile' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.settingIcon, { backgroundColor: Colors.border }]}>
                <Ionicons name="settings-outline" size={17} color={Colors.textSecondary} />
              </View>
              <Text style={styles.settingsLinkLabel}>Device notification settings</Text>
              <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* ── TIPS TAB ── */}
        {activeTab === 'tips' && (
          <>
            <View style={styles.tipsIntro}>
              <Text style={styles.tipsIntroTitle}>Get the most from MoodBoard</Text>
              <Text style={styles.tipsIntroBody}>
                These practices — based on mood-tracking research — help you build a habit that actually reveals patterns.
              </Text>
            </View>
            <View style={styles.tipsList}>
              {TIPS.map((tip) => (
                <View key={tip.id} style={styles.tipCard}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.bg }]}>
                    <Ionicons name={tip.icon} size={20} color={tip.color} />
                  </View>
                  <View style={styles.tipBody}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDesc}>{tip.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick-action CTA */}
            <TouchableOpacity
              style={styles.ctaCard}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/log' as any)}
            >
              <LinearGradient
                colors={['#7C3AED', '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.ctaText}>Log today's mood</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotifCard({
  item,
  onPress,
}: {
  item: NotifItem;
  onPress: (item: NotifItem) => void;
}) {
  const cfg = TYPE_CONFIG[item.type];
  return (
    <TouchableOpacity
      style={[styles.notifCard, item.read && styles.notifCardRead]}
      activeOpacity={0.78}
      onPress={() => onPress(item)}
    >
      <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={styles.notifBody}>
        <View style={styles.notifTopRow}>
          <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.notifTime}>{relativeTime(item.timestamp)}</Text>
        </View>
        <Text style={[styles.notifTitle, item.read && styles.notifTitleRead]}>
          {item.title}
        </Text>
        <Text style={styles.notifDesc} numberOfLines={2}>
          {item.body}
        </Text>
        {item.actionRoute && (
          <View style={styles.notifAction}>
            <Text style={styles.notifActionText}>Tap to view</Text>
            <Ionicons name="arrow-forward" size={12} color={cfg.color} />
          </View>
        )}
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function StatCard({
  icon,
  color,
  bg,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  color,
  bg,
  label,
  sublabel,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSub}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: '#22C55E' }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 16 },

  // Friend / Family request cards
  requestCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  requestLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  requestSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 10 },
  requestAccept: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestAcceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  requestDecline: {
    flex: 1,
    backgroundColor: Colors.border,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestDeclineText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title:      { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  unreadHint: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.primaryLight },
  headerBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  bellWrap: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: Colors.background,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabActive: {
    backgroundColor: Colors.card,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  tabText:       { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabBadge: {
    backgroundColor: '#EF4444', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyBody:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },

  // AI card
  aiCard: { borderRadius: 20, padding: 18, gap: 8 },
  aiCardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
  },
  aiCardBadgeText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  aiCardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 21 },
  aiCardBody:  { fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 18 },

  notifList: { gap: 10 },
  notifCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  notifCardRead: { opacity: 0.65 },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifBody:    { flex: 1, gap: 4 },
  notifTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 10, fontWeight: '700' },
  notifTitle:      { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, lineHeight: 18 },
  notifTitleRead:  { fontWeight: '500', color: Colors.textSecondary },
  notifDesc:       { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  notifTime:       { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  notifAction:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  notifActionText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6, flexShrink: 0 },

  clearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  clearText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  statIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', textAlign: 'center' },

  // Settings
  settingsCard: {
    backgroundColor: Colors.card, borderRadius: 18, padding: 16, gap: 14,
    borderWidth: 1, borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  settingsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  settingRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingInfo: { flex: 1 },
  settingLabel:{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  settingSub:  { fontSize: 11, color: Colors.textMuted, marginTop: 1, lineHeight: 15 },
  divider:     { height: 1, backgroundColor: Colors.border },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 10, padding: 10,
  },
  timeLabel:    { flex: 1, fontSize: 13, color: Colors.textSecondary },
  timeChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  timeChipText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  settingsLinkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  settingsLinkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  // Tips
  tipsIntro:      { gap: 6 },
  tipsIntroTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  tipsIntroBody:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  tipsList: { gap: 10 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  tipIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipBody:  { flex: 1, gap: 4 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  tipDesc:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  ctaCard:     { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  ctaText:     { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },
});
