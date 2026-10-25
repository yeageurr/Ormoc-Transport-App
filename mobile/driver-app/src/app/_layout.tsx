import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { NotificationCenterProvider } from '@/components/NotificationCenter';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

import {
  useFonts,
  Poppins_400Regular_Italic,
  Poppins_300Light_Italic,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold
} from '@expo-google-fonts/poppins';

import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold
} from '@expo-google-fonts/roboto';

SplashScreen.preventAutoHideAsync();

/**
 * Root Stack, gated on auth state. When isAuthenticated flips (via
 * signIn()/signOut() from useAuth), this re-renders and expo-router
 * automatically navigates to the newly-available group — no manual
 * router.replace() needed from LoginScreen.
 */
function RootNavigator() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();

  // Don't mount the Stack until we know the auth state — otherwise the
  // initial route gets picked with a guard value that's about to change.
  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 0 }}>
      <Stack.Protected guard={isAuthenticated && mustChangePassword}>
        <Stack.Screen name="change-password" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !mustChangePassword}>
        <Stack.Screen name="tabs" />
        <Stack.Screen name="edit-profile" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="entrance" options={{ animation: 'none' }} />
        <Stack.Screen name="login" options={{ animation: 'none' }} />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] =useFonts({
    Poppins_400Regular_Italic,
    Poppins_300Light_Italic,
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_700Bold
  })

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AuthProvider>
          <NotificationCenterProvider>
            <RootNavigator />
          </NotificationCenterProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
