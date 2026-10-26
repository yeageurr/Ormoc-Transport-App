import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CommuterRoute, CommuterVehicle } from '@/api/publicAPI';

type Props = {
  routes: CommuterRoute[];
  vehicles: CommuterVehicle[];
  selectedRouteId: number | null;
  selectedVehicleId: number | null;
  approachingVehicleIds: ReadonlySet<number>;
  onMapLoaded?: () => void;
  onSelectRoute: (routeId: number) => void;
  onSelectVehicle: (vehicleId: number) => void;
};

export default function CommuterLiveMap({ vehicles, approachingVehicleIds, onSelectVehicle, onMapLoaded }: Props) {
  useEffect(() => { onMapLoaded?.(); }, [onMapLoaded]);
  return <View style={styles.map}><View style={styles.water} /><View style={[styles.road, styles.roadOne]} /><View style={[styles.road, styles.roadTwo]} /><View style={[styles.road, styles.roadThree]} /><View style={[styles.road, styles.roadFour]}><Text style={styles.mapNote}>Open the Android app for the interactive live map.</Text></View>{vehicles.slice(0, 12).map((vehicle, index) => <Pressable key={vehicle.vehicle_id} onPress={() => onSelectVehicle(vehicle.vehicle_id)} style={[styles.marker, approachingVehicleIds.has(vehicle.vehicle_id) && styles.approachingMarker, { top: `${28 + (index * 17) % 58}%`, left: `${18 + (index * 23) % 68}%` }]}><Text style={styles.markerText}>▰</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: '#EAE7E4' },
  water: { position: 'absolute', width: 420, height: 320, right: -190, bottom: -20, borderRadius: 180, backgroundColor: '#9BE1F7', transform: [{ rotate: '-22deg' }] },
  road: { position: 'absolute', height: 8, borderRadius: 8, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#D6D2CE' },
  roadOne: { width: '125%', left: '-10%', top: '26%', transform: [{ rotate: '-17deg' }] },
  roadTwo: { width: '120%', left: '-8%', top: '49%', transform: [{ rotate: '12deg' }] },
  roadThree: { width: '100%', left: '10%', top: '63%', transform: [{ rotate: '-55deg' }] },
  roadFour: { width: '75%', left: '34%', top: '36%', transform: [{ rotate: '71deg' }] },
  mapNote: { position: 'absolute', top: 40, left: -45, width: 190, color: '#6E7F85', fontSize: 10, textAlign: 'center', transform: [{ rotate: '-71deg' }] },
  marker: { position: 'absolute', width: 34, height: 34, borderRadius: 18, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#05A9E8', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  approachingMarker: { borderColor: '#D9FFF0', backgroundColor: '#0A9D74' },
  markerText: { color: '#FFFFFF', fontSize: 17 },
});
