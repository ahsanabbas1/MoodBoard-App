import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MoodProvider } from '../store/MoodContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { useEffect } from 'react';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

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
