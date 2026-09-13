import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import BottomNav from '@/components/BottomNav';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';

export default function TabsLayout() {
  useCurrentLocation();
  return (
    <View style={styles.container}>
      <View style={styles.page}><Slot /></View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#042F2E' },
  page: { flex: 1 },
});
