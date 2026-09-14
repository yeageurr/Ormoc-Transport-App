import { StyleSheet, Text, View } from 'react-native';

export default function DriverMap({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <View style={[styles.card, fullScreen && styles.fullScreenCard]}>
      <Text style={styles.title}>Live map is available in the driver mobile app.</Text>
      <Text style={styles.text}>Open the Android development build to view your live location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 120, marginTop: 12, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#168F79', padding: 16, backgroundColor: '#086158' },
  fullScreenCard: { flex: 1, minHeight: undefined, marginTop: 0, borderRadius: 0 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  text: { marginTop: 5, color: '#A9D1CC', fontSize: 12 },
});
