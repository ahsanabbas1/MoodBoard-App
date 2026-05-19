import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MoodProvider } from '../store/MoodContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { restoreReminderIfNeeded, NOTIFICATIONS_SUPPORTED } from '../services/reminderService';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const responseListener = useRef<any>(null);

  // Route guard
  useEffect(() => {
    if (loading) return;

    const inTabsGroup  = segments[0] === '(tabs)';
    const onLoginScreen = segments[0] === 'login';
    const routeSettled = segments.length > 0;

    if (!user && (inTabsGroup || !routeSettled)) {
      router.replace('/login');
    } else if (user && (onLoginScreen || !routeSettled)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // Notification setup: restore reminder + handle taps
  useEffect(() => {
    if (!user || !NOTIFICATIONS_SUPPORTED) return;

    // Lazy-load so the import never runs in Expo Go
    import('expo-notifications').then((N) => {
      // Show alerts when the app is in the foreground
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Restore daily reminder if it was cleared (e.g. after reinstall)
      restoreReminderIfNeeded(user.id).catch(() => {});

      // Navigate to log screen when user taps a reminder notification
      responseListener.current = N.addNotificationResponseReceivedListener((response) => {
        const dest = response.notification.request.content.data?.navigateTo;
        if (dest === 'log') router.push('/(tabs)/log');
      });
    }).catch(() => {});

    return () => {
      responseListener.current?.remove();
    };
  }, [user?.id]);

  // Block rendering entirely while the session check is in flight.
  // This prevents any flash of the wrong screen.
  if (loading) {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <MoodProvider>
          <SafeAreaProvider>
            <NavigationGuard>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="entry/[id]"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Entry Detail',
                    headerStyle: { backgroundColor: '#F8F7FF' },
                    headerTintColor: '#7C6FFF',
                  }}
                />
              </Stack>
            </NavigationGuard>
          </SafeAreaProvider>
        </MoodProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
