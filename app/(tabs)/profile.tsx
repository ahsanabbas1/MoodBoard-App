import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useMood } from '../../store/MoodContext';
import { useAuth } from '../../store/AuthContext';
import { getMoodConfig } from '../../constants/Moods';
import { MoodLevel } from '../../types';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingRow({ icon, label, subtitle, value, onToggle, onPress, destructive }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !onToggle}
    >
      <View style={[styles.settingIcon, destructive && { backgroundColor: '#FEF2F2' }]}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? Colors.error : Colors.primary}
        />
      </View>
      <View style={styles.settingMeta}>
        <Text style={[styles.settingLabel, destructive && { color: Colors.error }]}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {onToggle !== undefined && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#fff"
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      ) : null}
    </TouchableOpacity>
  );
}

const skProfilePrefs = (uid: string) => `profile_prefs_${uid}`;

export default function ProfileScreen() {
  const { entries, getStreak, getAverageMood, reload } = useMood();
  const { user, updateProfile } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [prefsLoaded, setPrefsLoaded]     = useState(false);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  // Edit Username State
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsernameValue, setEditUsernameValue] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Load persisted prefs when user is known
  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(skProfilePrefs(user.id))
      .then((raw) => {
        if (raw) {
          const prefs = JSON.parse(raw);
          if (prefs.notifications !== undefined) setNotifications(prefs.notifications);
          if (prefs.dailyReminder  !== undefined) setDailyReminder(prefs.dailyReminder);
        }
      })
      .catch(() => {})
      .finally(() => setPrefsLoaded(true));
  }, [user?.id]);

  // Persist prefs on change
  useEffect(() => {
    if (!prefsLoaded || !user?.id) return;
    AsyncStorage.setItem(
      skProfilePrefs(user.id),
      JSON.stringify({ notifications, dailyReminder }),
    ).catch(() => {});
  }, [notifications, dailyReminder, prefsLoaded]);

  const streak = getStreak();
  const avg30 = getAverageMood(30);
  const totalEntries = entries.length;

  const avgConfig = avg30 > 0 ? getMoodConfig(Math.round(avg30) as MoodLevel) : null;

  const firstEntryDate = entries.length > 0
    ? new Date(entries[entries.length - 1].date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long', year: 'numeric',
      })
    : null;

  async function handleExport() {
    if (entries.length === 0) {
      Alert.alert('No data', 'Log some moods first before exporting.');
      return;
    }
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { email: user?.email, name: user?.fullName },
        totalEntries: entries.length,
        entries: entries.map((e) => ({
          date: e.date,
          time: e.time,
          mood: e.mood,
          intensity: e.intensity,
          note: e.note,
          tags: e.tags,
        })),
      };
      // Share the JSON as a plain-text message — works on Android/iOS without file-system access
      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: 'MoodBoard Export',
      });
    } catch (err: any) {
      Alert.alert('Export failed', err?.message ?? 'Please try again.');
    }
  }

  function handleClearData() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your mood entries, family circles, and cached data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            const uid = user.id;
            const { clearAllEntries } = await import('../../store/database');
            await clearAllEntries(uid);
            // Wipe all user-scoped AsyncStorage keys for this account
            await AsyncStorage.multiRemove([
              `circle_family_v5_${uid}`,
              `circle_friends_v5_${uid}`,
              `privacy_share_mood_${uid}`,
              `privacy_share_notes_${uid}`,
              `notifications_v1_${uid}`,
              `reminder_settings_v1_${uid}`,
              `ai_insights_cache_${uid}`,
              `profile_prefs_${uid}`,
            ]).catch(() => {});
            await reload();
            Alert.alert('Cleared', 'All your data has been deleted.');
          },
        },
      ],
    );
  }

  async function handleSaveName() {
    if (editNameValue.trim().length > 0) {
      await updateProfile({ fullName: editNameValue.trim() });
    }
    setIsEditingName(false);
  }

  async function handleSaveUsername() {
    const val = editUsernameValue.trim().replace(/\s+/g, '');
    if (val.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      setUsernameError('Only letters, numbers, and underscores allowed.');
      return;
    }
    if (!user?.id) return;
    const { checkUsernameAvailable } = await import('../../services/userService');
    const available = await checkUsernameAvailable(val, user.id);
    if (!available) {
      setUsernameError('That username is already taken.');
      return;
    }
    await updateProfile({ username: val });
    setIsEditingUsername(false);
    setUsernameError('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <LinearGradient
          colors={['#7C6FFF', '#FF6B9D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{user?.fullName || 'User'}</Text>
            <TouchableOpacity onPress={() => {
              setEditNameValue(user?.fullName || '');
              setIsEditingName(true);
            }}>
              <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6, marginTop: 4 }} />
            </TouchableOpacity>
          </View>
          {user?.username ? (
            <TouchableOpacity onPress={() => { setEditUsernameValue(user.username || ''); setUsernameError(''); setIsEditingUsername(true); }} style={styles.usernameRow}>
              <Text style={styles.usernameText}>@{user.username}</Text>
              <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setEditUsernameValue(''); setUsernameError(''); setIsEditingUsername(true); }} style={styles.usernameRow}>
              <Text style={styles.usernameText}>Set username</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.profileSince}>
            {firstEntryDate ? `Tracking since ${firstEntryDate}` : 'Start logging your mood!'}
          </Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>
              {streak > 7 ? '🔥 On Fire!' : streak > 3 ? '⚡ Building Habits' : '🌱 Getting Started'}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F97316' }]}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{totalEntries}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {avgConfig ? avgConfig.emoji : '—'}
            </Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="notifications"
              label="Push Notifications"
              subtitle="Receive mood reminders"
              value={notifications}
              onToggle={setNotifications}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="alarm"
              label="Daily Reminder"
              subtitle="Remind me to log my mood at 8:00 PM"
              value={dailyReminder}
              onToggle={setDailyReminder}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="moon"
              label="Dark Mode"
              subtitle="Coming soon"
              onPress={() => Alert.alert('Coming Soon', 'Dark mode will be available in the next update!')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="language"
              label="Language"
              subtitle="English"
              onPress={() => Alert.alert('Coming Soon', 'More languages coming soon!')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="lock-closed"
              label="App Lock"
              subtitle="Protect with Face ID / PIN"
              onPress={() => Alert.alert('Coming Soon', 'App lock coming in the next update!')}
            />
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="download"
              label="Export Data"
              subtitle="Download your mood history"
              onPress={handleExport}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="cloud-upload"
              label="Backup to Cloud"
              subtitle="Coming soon"
              onPress={() => Alert.alert('Coming Soon', 'Cloud backup coming soon!')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="trash"
              label="Clear All Data"
              subtitle="Permanently delete all entries"
              onPress={handleClearData}
              destructive
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="information-circle"
              label="Version"
              subtitle="1.0.0"
            />
            <View style={styles.divider} />
            <SettingRow
              icon="heart"
              label="Rate the App"
              onPress={() => Alert.alert('Thank you!', 'Rating option will be available on the App Store!')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="mail"
              label="Contact Support"
              onPress={() => router.push('/(tabs)/contact' as any)}
            />
          </View>
        </View>

        <Text style={styles.footer}>Made with ❤️ for your mental wellness</Text>
      </ScrollView>

      {/* Edit Username Modal */}
      <Modal visible={isEditingUsername} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Username</Text>
            <TextInput
              style={[styles.modalInput, usernameError ? { borderColor: Colors.error } : null]}
              value={editUsernameValue}
              onChangeText={(v) => { setEditUsernameValue(v); setUsernameError(''); }}
              placeholder="e.g. HappyPanda42"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {usernameError ? <Text style={styles.usernameErrorText}>{usernameError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setIsEditingUsername(false); setUsernameError(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveUsername}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Name Modal */}
      <Modal visible={isEditingName} transparent animationType="fade">
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsEditingName(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveName}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 40, gap: 20 },

  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  usernameText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  usernameErrorText: { fontSize: 13, color: Colors.error, marginBottom: 8 },
  profileSince: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  profileBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 99,
    marginTop: 4,
  },
  profileBadgeText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: Colors.border },

  section: { paddingHorizontal: 20, gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingMeta: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  settingSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 66 },

  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    paddingHorizontal: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
