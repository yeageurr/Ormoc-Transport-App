import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useDriverLocation } from '@/hooks/useDriverLocation';
import type { RouteGeometry } from '@/api/dispatchAPI';

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

export default function DriverMap({
  fullScreen = false,
  routeGeometry = null,
  followDriver = false,
  isReturning = false,
  historyPath = false,
}: {
  fullScreen?: boolean;
  routeGeometry?: RouteGeometry | null;
  followDriver?: boolean;
  isReturning?: boolean;
  historyPath?: boolean;
}) {
  const location = useDriverLocation();
  const coordinates = routeGeometry?.coordinates ?? [];
  const centerCoordinate: [number, number] = historyPath && coordinates.length
    ? coordinates[0]
    : location
      ? [location.longitude, location.latitude]
      : ORMOC_CENTER;
  const routeBounds = useMemo(() => {
    const routeCoordinates = routeGeometry?.coordinates ?? [];
    if (followDriver || routeCoordinates.length < 2) return null;
    const limits = routeCoordinates.reduce((bounds, [longitude, latitude]) => ({
      maxLongitude: Math.max(bounds.maxLongitude, longitude),
      minLongitude: Math.min(bounds.minLongitude, longitude),
      maxLatitude: Math.max(bounds.maxLatitude, latitude),
      minLatitude: Math.min(bounds.minLatitude, latitude),
    }), {
      maxLongitude: Number.NEGATIVE_INFINITY,
      minLongitude: Number.POSITIVE_INFINITY,
      maxLatitude: Number.NEGATIVE_INFINITY,
      minLatitude: Number.POSITIVE_INFINITY,
    });
    return {
      ne: [limits.maxLongitude, limits.maxLatitude] as [number, number],
      sw: [limits.minLongitude, limits.minLatitude] as [number, number],
      paddingTop: historyPath ? 55 : 125,
      paddingRight: historyPath ? 30 : 35,
      paddingBottom: historyPath ? 55 : 235,
      paddingLeft: historyPath ? 30 : 35,
    };
  }, [routeGeometry, followDriver, historyPath]);
  const startCoordinate = coordinates.length > (historyPath ? 0 : 1)
    ? historyPath ? coordinates[0] : isReturning ? coordinates[coordinates.length - 1] : coordinates[0]
    : null;
  const destinationCoordinate = coordinates.length > 1
    ? historyPath ? coordinates[coordinates.length - 1] : isReturning ? coordinates[0] : coordinates[coordinates.length - 1]
    : null;

  if (!mapboxToken) {
    return (
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>Map unavailable</Text>
        <Text style={styles.messageText}>A Mapbox public token has not been configured.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, fullScreen && styles.fullScreenContainer]}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street}>
        <Mapbox.Camera
          key={historyPath ? 'fit-trip-history' : followDriver ? 'follow-driver' : 'fit-route'}
          {...(routeBounds ? { bounds: routeBounds, animationMode: 'easeTo' as const } : { centerCoordinate, zoomLevel: followDriver ? 16 : 12 })}
          animationDuration={500}
        />
        {routeGeometry && (
          <Mapbox.ShapeSource id="assigned-route" shape={routeGeometry}>
            <Mapbox.LineLayer
              id="assigned-route-line"
              style={{ lineColor: historyPath ? '#F2D65C' : '#22D3EE', lineWidth: historyPath ? 6 : 8, lineOpacity: 0.95, lineJoin: 'round', lineCap: 'round' }}
            />
          </Mapbox.ShapeSource>
        )}
        {startCoordinate && (
          <Mapbox.PointAnnotation
            id="dispatch-start-pin"
            coordinate={startCoordinate}
            title={historyPath ? 'Trip start' : isReturning ? 'Start: destination' : 'Start: terminal'}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pin} collapsable={false}>
              <Ionicons name="location-sharp" size={34} color={historyPath ? '#15966F' : '#15966F'} />
            </View>
          </Mapbox.PointAnnotation>
        )}
        {destinationCoordinate && (
          <Mapbox.PointAnnotation
            id="dispatch-destination-pin"
            coordinate={destinationCoordinate}
            title={historyPath ? 'Trip end' : isReturning ? 'Destination: terminal' : 'Destination: route end'}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pin} collapsable={false}>
              <Ionicons name="location-sharp" size={34} color="#D9544D" />
            </View>
          </Mapbox.PointAnnotation>
        )}
        {!historyPath && location && (
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
      {!fullScreen && (
        <View style={styles.label} pointerEvents="none">
          <View style={styles.dot} />
          <Text style={styles.labelText}>{location ? 'Your live location' : 'Waiting for GPS location…'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 250, marginTop: 12, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: '#168F79' },
  fullScreenContainer: { flex: 1, height: undefined, marginTop: 0, borderRadius: 0, borderWidth: 0 },
  map: { flex: 1 },
  pin: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(4, 47, 46, 0.88)' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#41EA43' },
  labelText: { color: '#E7FFFB', fontSize: 11, fontWeight: '700' },
  messageCard: { minHeight: 120, marginTop: 12, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#8D6B20', padding: 16, backgroundColor: '#3A300E' },
  messageTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  messageText: { marginTop: 5, color: '#F5D68B', fontSize: 12 },
});
