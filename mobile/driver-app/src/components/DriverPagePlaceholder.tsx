import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function DriverPagePlaceholder({
  title,
  icon,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.emptyState}>
        <Ionicons name={icon} size={42} color="#2DD4BF" />
        <Text style={styles.emptyTitle}>{title} screen</Text>
        <Text style={styles.description}>This section is ready for its driver workflow.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#042F2E', paddingHorizontal: 18, paddingTop: 16 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 70 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 14 },
  description: { color: '#A9D1CC', fontSize: 14, marginTop: 7 },
});
