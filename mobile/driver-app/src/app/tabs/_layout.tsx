import { Stack, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import BottomNav from '@/components/BottomNav';
import { DriverLocationProvider } from '@/hooks/useDriverLocation';

export default function TabsLayout() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const pageOrder: Record<string, number> = {
    '/tabs': 0,
    '/tabs/': 0,
    '/tabs/trip-logs': 1,
    '/tabs/profile': 2,
  };
  const previousOrder = pageOrder[previousPathname.current];
  const currentOrder = pageOrder[pathname];
  const animation = previousOrder != null && currentOrder != null && currentOrder < previousOrder
    ? 'slide_from_left'
    : 'slide_from_right';

  useEffect(() => {
    previousPathname.current = pathname;
  }, [pathname]);

  return (
    <DriverLocationProvider>
      <View style={styles.container}>
        <View style={styles.page}>
          <Stack screenOptions={{ headerShown: false, animation, animationDuration: 0 }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="explore" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="record-trip" />
            <Stack.Screen name="report-incident" />
            <Stack.Screen name="trip-logs" />
          </Stack>
        </View>
        {pathname !== '/tabs/record-trip' && <BottomNav />}
      </View>
    </DriverLocationProvider>
  );
}

const styles = StyleSheet.create({
  // The light canvas behind the nav makes its rounded top corners visible.
  container: { flex: 1, backgroundColor: '#E5EBF4' },
  page: { flex: 1 },
});
