import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useMood } from '../../store/MoodContext';
import { useAuth } from '../../store/AuthContext';
import { getMoodConfig } from '../../constants/Moods';
import StatCard from '../../components/StatCard';
import EntryCard from '../../components/EntryCard';
import WeekMoodChart from '../../components/WeekMoodChart';
import AnimatedEmoji from '../../components/AnimatedEmoji';
import SectionHeader from '../../components/SectionHeader';
import { getGreeting, formatDate } from '../../utils/date';
import { useMoodStats } from '../../hooks/useMoodStats';
import { useNotificationBadge } from '../../hooks/useNotificationBadge';

export default function HomeScreen() {
  const router = useRouter();
  const { getTodayEntry, reload } = useMood();
  const { signOut, user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const {
    streak,
    avgConfig,
    weekData,
    weekMonthLabel,
    recentEntries,
    totalEntries
  } = useMoodStats(weekOffset);

  const [refreshing, setRefreshing] = useState(false);
  const unreadCount = useNotificationBadge();

  const todayEntry = getTodayEntry();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.date}>{formatDate(new Date())}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(tabs)/notifications' as any)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={24}
                color={unreadCount > 0 ? Colors.primary : Colors.textPrimary}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
              <LinearGradient colors={['#7C6FFF', '#FF6B9D']} style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Mood Card */}
        {todayEntry ? (
          <LinearGradient
            colors={getMoodConfig(todayEntry.mood).gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.todayCard}
          >
            <View style={styles.todayCardTop}>
              <View>
                <Text style={styles.todayCardLabel}>Today's Mood</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <AnimatedEmoji
                    emoji={getMoodConfig(todayEntry.mood).emoji}
                    type="float"
                    style={styles.todayCardMoodEmoji}
                  />
                  <Text style={styles.todayCardMood}>
                    {getMoodConfig(todayEntry.mood).label}
                  </Text>
                </View>
                {todayEntry.note ? (
                  <Text style={styles.todayCardNote} numberOfLines={2}>
                    "{todayEntry.note}"
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push(`/entry/${todayEntry.id}` as any)}
              >
                <Ionicons name="pencil" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.todayCardTime}>Logged at {todayEntry.time}</Text>
          </LinearGradient>
        ) : (
          <TouchableOpacity
            style={styles.logPromptCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/log')}
          >
            <LinearGradient
              colors={['#7C6FFF', '#9F97FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logPromptGradient}
            >
              <Text style={styles.logPromptEmoji}>🌟</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.logPromptTitle}>How are you feeling?</Text>
                <Text style={styles.logPromptSub}>Tap to log today's mood</Text>
              </View>
              <View style={styles.logPromptArrow}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard
            label="Day Streak"
            value={streak}
            icon="🔥"
            color={streak > 0 ? '#F97316' : Colors.textMuted}
            subtitle={streak === 1 ? 'day' : 'days'}
            delay={0}
          />
          <StatCard
            label="This Week"
            value={weekData.filter((d) => d.mood !== null).length}
            icon="📅"
            color={Colors.primary}
            subtitle="entries"
            delay={80}
          />
          <StatCard
            label="Avg Mood"
            value={avgConfig ? avgConfig.emoji : '—'}
            icon={undefined}
            color={avgConfig ? avgConfig.color : Colors.textMuted}
            subtitle={avgConfig ? avgConfig.label : 'No data'}
            delay={160}
          />
        </View>

        {/* Week Chart */}
        <View style={styles.card}>
          <View style={styles.weekNavRow}>
            <TouchableOpacity
              style={styles.weekNavBtn}
              onPress={() => setWeekOffset((o) => o - 1)}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.weekTitle}>
              {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} Weeks Ago`}
            </Text>
            <TouchableOpacity
              style={[styles.weekNavBtn, weekOffset >= 0 && styles.weekNavBtnDisabled]}
              onPress={() => setWeekOffset((o) => Math.min(o + 1, 0))}
              disabled={weekOffset >= 0}
            >
              <Ionicons name="chevron-forward" size={18} color={weekOffset >= 0 ? Colors.border : Colors.primary} />
            </TouchableOpacity>
          </View>
          <WeekMoodChart data={weekData} monthLabel={weekMonthLabel} />
        </View>

        {/* Recent Entries */}
        <SectionHeader
          title="Recent Entries"
          action={totalEntries > 5 ? 'See all' : undefined}
          onAction={() => router.push('/(tabs)/history')}
        />
        {recentEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySub}>Start logging your mood to see entries here</Text>
          </View>
        ) : (
          recentEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} showDate />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 11,
  },
  avatarBtn: { borderRadius: 22, overflow: 'hidden' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },

  todayCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  todayCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  todayCardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  todayCardMoodEmoji: { fontSize: 32 },
  todayCardMood: { fontSize: 24, fontWeight: '700', color: '#fff' },
  todayCardNote: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, fontStyle: 'italic' },
  todayCardTime: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  editBtn: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logPromptCard: { borderRadius: 20, overflow: 'hidden' },
  logPromptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  logPromptEmoji: { fontSize: 32 },
  logPromptTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  logPromptSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logPromptArrow: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: 10 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavBtnDisabled: { opacity: 0.35 },
  weekTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
