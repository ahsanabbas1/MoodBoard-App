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
import { getMoodConfig } from '../../constants/Moods';
import StatCard from '../../components/StatCard';
import EntryCard from '../../components/EntryCard';
import WeekMoodChart from '../../components/WeekMoodChart';
import SectionHeader from '../../components/SectionHeader';
import { getGreeting, formatDate } from '../../utils/date';
import { useMoodStats } from '../../hooks/useMoodStats';

export default function HomeScreen() {
  const router = useRouter();
  const { getTodayEntry } = useMood();
  const { 
    streak, 
    avgConfig, 
    weekData, 
    recentEntries, 
    totalEntries 
  } = useMoodStats();
  
  const [refreshing, setRefreshing] = useState(false);

  const todayEntry = getTodayEntry();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

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
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            <LinearGradient colors={['#7C6FFF', '#FF6B9D']} style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </LinearGradient>
          </TouchableOpacity>
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
                <Text style={styles.todayCardMood}>
                  {getMoodConfig(todayEntry.mood).emoji} {getMoodConfig(todayEntry.mood).label}
                </Text>
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
          />
          <StatCard
            label="This Week"
            value={weekData.filter((d) => d.mood !== null).length}
            icon="📅"
            color={Colors.primary}
            subtitle="entries"
          />
          <StatCard
            label="Avg Mood"
            value={avgConfig ? avgConfig.emoji : '—'}
            icon={undefined}
            color={avgConfig ? avgConfig.color : Colors.textMuted}
            subtitle={avgConfig ? avgConfig.label : 'No data'}
          />
        </View>

        {/* Week Chart */}
        <View style={styles.card}>
          <SectionHeader title="This Week" />
          <WeekMoodChart data={weekData} />
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
  todayCardMood: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 4 },
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

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
