import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MoodProvider } from '../store/MoodContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup  = segments[0] === '(tabs)';
    const onLoginScreen = segments[0] === 'login';
    // segments[0] is undefined on the very first render before Expo Router
    // has resolved the initial route — treat that as "not yet settled"
    const routeSettled = segments.length > 0;

    if (!user && (inTabsGroup || !routeSettled)) {
      router.replace('/login');
    } else if (user && (onLoginScreen || !routeSettled)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

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
