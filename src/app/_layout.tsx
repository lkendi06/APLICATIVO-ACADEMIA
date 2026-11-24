import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfigMissing } from '@/components/ConfigMissing';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FeedbackProvider } from '@/contexts/FeedbackContext';
import { PreferencesSync } from '@/components/PreferencesSync';
import { isSupabaseConfigured } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <FeedbackProvider>
              {isSupabaseConfigured() ? (
                <AuthProvider>
                  <PreferencesSync />
                  <RootNavigator />
                </AuthProvider>
              ) : (
                <ConfigMissing />
              )}
            </FeedbackProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, initializing, recovering } = useAuth();
  const { colors, scheme } = useTheme();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync().catch(() => undefined);
  }, [initializing]);

  if (initializing) return null;

  const signedIn = !!session;
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !recovering}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="workouts" />
          <Stack.Screen name="exercises" />
          <Stack.Screen name="session" />
          <Stack.Screen name="metrics" />
          <Stack.Screen name="history" />
          <Stack.Screen name="goals" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
        <Stack.Screen name="reset-password" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
        <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
