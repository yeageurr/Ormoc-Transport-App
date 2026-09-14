import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import BottomNav from '@/components/BottomNav';
import { DriverLocationProvider } from '@/hooks/useDriverLocation';

export default function TabsLayout() {
  return (
    <DriverLocationProvider>
      <View style={styles.container}>
        <View style={styles.page}><Slot /></View>
        <BottomNav />
      </View>
    </DriverLocationProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#042F2E' },
  page: { flex: 1 },
});
