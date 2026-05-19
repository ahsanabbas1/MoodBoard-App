import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// expo-notifications local scheduling does not work in Expo Go since SDK 53.
// All functions below are no-ops when running in Expo Go so the app never
// touches the module (which throws errors on import in that environment).
export const NOTIFICATIONS_SUPPORTED =
  Constants.executionEnvironment !== 'storeClient';

const REMINDER_ID_KEY = 'mood_reminder_notification_id';
const reminderEnabledKey = (uid: string) => `mood_reminder_enabled_${uid}`;
const reminderHourKey    = (uid: string) => `mood_reminder_hour_${uid}`;

// Lazy-load expo-notifications so the import itself never crashes Expo Go.
async function getNotifications() {
  if (!NOTIFICATIONS_SUPPORTED) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/** Request system notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Schedule (or reschedule) the daily mood reminder at `hour:minute` local time. */
export async function scheduleReminder(userId: string, hour = 20, minute = 0): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    await cancelReminder();

    const id = await N.scheduleNotificationAsync({
      content: {
        title: 'How are you feeling today? 🌟',
        body: "Don't break your streak — take a moment to log your mood.",
        data: { navigateTo: 'log' },
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      } as any,
    });

    await AsyncStorage.multiSet([
      [REMINDER_ID_KEY, id],
      [reminderEnabledKey(userId), 'true'],
      [reminderHourKey(userId), String(hour)],
    ]);
    return true;
  } catch (err) {
    console.warn('[Reminder] scheduleReminder failed:', err);
    return false;
  }
}

/** Cancel the current scheduled reminder. */
export async function cancelReminder(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  try {
    const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY);
    if (existingId) {
      await N.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(REMINDER_ID_KEY);
    }
  } catch {}
}

/** Disable the reminder for a user (cancel + persist preference). */
export async function disableReminder(userId: string): Promise<void> {
  await cancelReminder();
  await AsyncStorage.setItem(reminderEnabledKey(userId), 'false');
}

/** Whether the reminder is currently enabled for this user. */
export async function isReminderEnabled(userId: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(reminderEnabledKey(userId));
  return val === 'true';
}

/** The scheduled hour (defaults to 20). */
export async function getReminderHour(userId: string): Promise<number> {
  const val = await AsyncStorage.getItem(reminderHourKey(userId));
  return val !== null ? parseInt(val, 10) : 20;
}

/**
 * Restore the scheduled reminder on app start in case it was cleared
 * (e.g. after reinstall). No-op when notifications are not supported.
 */
export async function restoreReminderIfNeeded(userId: string): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  try {
    const enabled = await isReminderEnabled(userId);
    if (!enabled) return;
    const scheduled = await N.getAllScheduledNotificationsAsync();
    const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY);
    if (!scheduled.some((n) => n.identifier === existingId)) {
      const hour = await getReminderHour(userId);
      await scheduleReminder(userId, hour);
    }
  } catch {}
}

/** e.g. 20 → "8:00 PM" */
export function formatReminderTime(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}
