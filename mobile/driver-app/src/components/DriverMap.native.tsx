import Mapbox from '@rnmapbox/maps';
import { StyleSheet, Text, View } from 'react-native';

import { useDriverLocation } from '@/hooks/useDriverLocation';

const ORMOC_CENTER: [number, number] = [124.6075, 11.0064];
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
const locationCircleStyle: Mapbox.CircleLayerStyle = {
  circleRadius: 8,
  circleColor: '#22D3EE',
  circleStrokeWidth: 3,
  circleStrokeColor: '#FFFFFF',
};

if (mapboxToken) {
  void Mapbox.setAccessToken(mapboxToken);
}

export default function DriverMap() {
  const location = useDriverLocation();
  const centerCoordinate: [number, number] = location
    ? [location.longitude, location.latitude]
    : ORMOC_CENTER;

  if (!mapboxToken) {
    return (
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>Map unavailable</Text>
        <Text style={styles.messageText}>A Mapbox public token has not been configured.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street} logoEnabled={false} attributionEnabled={false}>
        <Mapbox.Camera centerCoordinate={centerCoordinate} zoomLevel={location ? 15 : 12} animationDuration={700} />
        {location && (
          <Mapbox.ShapeSource
            id="driver-current-location"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: centerCoordinate },
            }}
          >
            <Mapbox.CircleLayer id="driver-current-location-circle" style={locationCircleStyle} />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>
      <View style={styles.label} pointerEvents="none">
        <View style={styles.dot} />
        <Text style={styles.labelText}>{location ? 'Your live location' : 'Waiting for GPS location…'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 250, marginTop: 12, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: '#168F79' },
  map: { flex: 1 },
  label: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(4, 47, 46, 0.88)' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#41EA43' },
  labelText: { color: '#E7FFFB', fontSize: 11, fontWeight: '700' },
  messageCard: { minHeight: 120, marginTop: 12, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#8D6B20', padding: 16, backgroundColor: '#3A300E' },
  messageTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  messageText: { marginTop: 5, color: '#F5D68B', fontSize: 12 },
});
