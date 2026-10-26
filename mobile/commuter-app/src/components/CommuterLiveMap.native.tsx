import Mapbox from '@rnmapbox/maps';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CommuterRoute, CommuterVehicle } from '@/api/publicAPI';

const ORMOC_CENTER: [number, number] = [124.6075, 11.0064];
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (mapboxToken) void Mapbox.setAccessToken(mapboxToken);

type Props = {
  routes: CommuterRoute[];
  vehicles: CommuterVehicle[];
  selectedRouteId: number | null;
  selectedVehicleId: number | null;
  onMapLoaded?: () => void;
  onSelectRoute: (routeId: number) => void;
  onSelectVehicle: (vehicleId: number) => void;
};

export default function CommuterLiveMap({ routes, vehicles, selectedRouteId, selectedVehicleId, onSelectRoute, onSelectVehicle, onMapLoaded }: Props) {
  const selectedRoute = routes.find((route) => route.route_id === selectedRouteId) ?? null;
  const selectedVehicle = vehicles.find((vehicle) => vehicle.vehicle_id === selectedVehicleId) ?? null;
  const coordinates = selectedRoute?.route_geometry?.coordinates ?? [];
  const bounds = useMemo(() => {
    if (coordinates.length < 2) return null;
    const limits = coordinates.reduce((value, [longitude, latitude]) => ({
      ne: [Math.max(value.ne[0], longitude), Math.max(value.ne[1], latitude)] as [number, number],
      sw: [Math.min(value.sw[0], longitude), Math.min(value.sw[1], latitude)] as [number, number],
    }), { ne: [-Infinity, -Infinity] as [number, number], sw: [Infinity, Infinity] as [number, number] });
    return { ...limits, paddingTop: 100, paddingRight: 45, paddingBottom: 230, paddingLeft: 45 };
  }, [coordinates]);
  const center = selectedVehicle
    ? [selectedVehicle.longitude, selectedVehicle.latitude] as [number, number]
    : coordinates.length
      ? coordinates[Math.floor(coordinates.length / 2)]
      : ORMOC_CENTER;

  useEffect(() => {
    if (!mapboxToken) onMapLoaded?.();
  }, [onMapLoaded]);

  if (!mapboxToken) {
    return <View style={styles.unavailable}><Text style={styles.mapGlyph}>⌖</Text><Text style={styles.unavailableTitle}>Map token required</Text><Text style={styles.unavailableCopy}>Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to the commuter app environment.</Text></View>;
  }

  return (
    <Mapbox.MapView style={StyleSheet.absoluteFill} styleURL={Mapbox.StyleURL.Street} logoEnabled={false} attributionEnabled onDidFinishLoadingMap={onMapLoaded}>
      <Mapbox.Camera
        key={`${selectedRouteId ?? 'all'}-${selectedVehicleId ?? 'none'}`}
        {...(selectedVehicle ? { centerCoordinate: center, zoomLevel: 15 } : bounds ? { bounds, animationMode: 'easeTo' as const } : { centerCoordinate: center, zoomLevel: 12 })}
        animationDuration={450}
      />
      {routes.map((route, index) => {
        if (!route.route_geometry) return null;
        const isValencia = route.destination_name.toLowerCase().includes('valencia');
        const routeColor = isValencia ? '#17BFD5' : index % 2 ? '#8A55E8' : '#17BFD5';
        return (
          <Mapbox.ShapeSource key={`route-${route.route_id}`} id={`route-${route.route_id}`} shape={route.route_geometry} onPress={() => onSelectRoute(route.route_id)}>
            <Mapbox.LineLayer
              id={`route-line-${route.route_id}`}
              style={{ lineColor: routeColor, lineWidth: selectedRouteId === route.route_id ? 7 : 4, lineOpacity: selectedRouteId === route.route_id ? 1 : 0.62, lineJoin: 'round', lineCap: 'round' }}
            />
          </Mapbox.ShapeSource>
        );
      })}
      {vehicles.map((vehicle) => (
        <Mapbox.MarkerView key={`vehicle-${vehicle.vehicle_id}`} id={`vehicle-${vehicle.vehicle_id}`} coordinate={[vehicle.longitude, vehicle.latitude]} anchor={{ x: 0.5, y: 0.5 }}>
          <Pressable onPress={() => onSelectVehicle(vehicle.vehicle_id)} style={[styles.vehicleMarker, selectedVehicleId === vehicle.vehicle_id && styles.vehicleMarkerSelected]} accessibilityLabel={`Select vehicle ${vehicle.plate_number}`}>
            <View style={styles.busGlyph}><View style={styles.busWindow} /><View style={styles.busWheelOne} /><View style={styles.busWheelTwo} /></View>
          </Pressable>
        </Mapbox.MarkerView>
      ))}
      {routes.map((route) => {
        const routeStart = route.route_geometry?.coordinates[0];
        return routeStart ? <Mapbox.PointAnnotation key={`terminal-${route.route_id}`} id={`terminal-${route.route_id}`} coordinate={routeStart} title={route.origin_name}><View style={styles.terminalPin} collapsable={false}><View style={styles.terminalDot} /></View></Mapbox.PointAnnotation> : null;
      })}
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  vehicleMarker: { width: 34, height: 34, borderRadius: 18, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#05A9E8', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  vehicleMarkerSelected: { width: 42, height: 42, borderRadius: 22, backgroundColor: '#007FB8' },
  terminalPin: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  terminalDot: { width: 15, height: 15, borderRadius: 8, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#0A9D74', elevation: 3 },
  busGlyph: { width: 18, height: 13, borderRadius: 3, backgroundColor: '#FFFFFF', position: 'relative' },
  busWindow: { position: 'absolute', left: 3, right: 3, top: 2, height: 5, borderRadius: 1, backgroundColor: '#5DC4E8' },
  busWheelOne: { position: 'absolute', left: 3, bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#184255' },
  busWheelTwo: { position: 'absolute', right: 3, bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#184255' },
  mapGlyph: { color: '#4C9BB6', fontSize: 38, lineHeight: 42 },
  unavailable: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, backgroundColor: '#E8E6E3' },
  unavailableTitle: { marginTop: 10, color: '#183647', fontSize: 17, fontWeight: '600' },
  unavailableCopy: { marginTop: 5, color: '#617781', fontSize: 12, textAlign: 'center' },
});
