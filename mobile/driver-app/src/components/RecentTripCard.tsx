import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { DriverTrip } from '@/api/tripsAPI';

export default function RecentTripCard({ trip }: { trip: DriverTrip }) {
  const departed = new Date(trip.time_departed);
  const arrived = trip.time_arrived ? new Date(trip.time_arrived) : null;
  const status = trip.status === 'returning' ? 'Returning' : 'Outgoing';
  const duration = trip.trip_duration_minutes === null ? null : `${Math.round(trip.trip_duration_minutes)} mins`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.plate}><Ionicons name="car-sport-outline" size={13} color="#A9D1CC" /><Text style={styles.plateText}>{trip.vehicle_plate ?? `Trip #${trip.trip_id}`}</Text></View>
        <View style={styles.status}><Ionicons name={trip.status === 'returning' ? 'arrow-down-outline' : 'arrow-up-outline'} size={10} color="#C0FFF8" /><Text style={styles.statusText}>{status}</Text></View>
      </View>
      <View style={styles.routeRow}><Ionicons name="location-outline" size={16} color="#27E0D2" /><Text style={styles.route}>{trip.route_label ?? 'Assigned route'}</Text></View>
      <Text style={styles.meta}>{duration ?? 'Trip in progress'} • {formatDate(departed)}</Text>
      <View style={styles.divider} />
      <TripTime label="Departed" time={formatTime(departed)} color="#57D561" />
      <TripTime label="Arrived" time={arrived ? formatTime(arrived) : 'In progress'} color="#27E0D2" />
    </View>
  );
}

function TripTime({ label, time, color }: { label: string; time: string; color: string }) {
  return <View style={styles.timeRow}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={styles.timeLabel}>{label}</Text><Text style={styles.time}>{time}</Text></View>;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  card: { padding: 11, marginBottom: 9, borderRadius: 5, backgroundColor: '#086158' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plateText: { color: '#A9D1CC', fontSize: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#168F79' },
  statusText: { color: '#C0FFF8', fontSize: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8 },
  route: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  meta: { color: '#A9D1CC', fontSize: 8, marginTop: 5, marginLeft: 19 },
  divider: { height: 1, backgroundColor: 'rgba(169, 209, 204, 0.24)', marginVertical: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  timeLabel: { color: '#D9F4F0', fontSize: 9 },
  time: { color: '#FFFFFF', fontSize: 9, fontWeight: '600', marginLeft: 'auto' },
});
