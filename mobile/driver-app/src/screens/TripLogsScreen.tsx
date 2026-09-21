import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTripLogs, type DriverTrip } from '@/api/tripsAPI';
import RecentTripCard from '@/components/RecentTripCard';
import { NotificationBell } from '@/components/NotificationCenter';

function isToday(value: string) { const date = new Date(value); const today = new Date(); return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate(); }

export default function TripLogsScreen() {
  const [trips, setTrips] = useState<DriverTrip[]>([]); const [query, setQuery] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setTrips(await getTripLogs()); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => trips.filter((trip) => `${trip.vehicle_plate ?? ''} ${trip.route_label ?? ''}`.toLowerCase().includes(query.toLowerCase())), [query, trips]);
  const todayCount = trips.filter((trip) => isToday(trip.time_departed)).length;
  return <SafeAreaView style={styles.screen} edges={['top']}><StatusBar barStyle="light-content" /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.titleRow}><Text style={styles.title}>Trip Logs</Text><NotificationBell /></View>
    <View style={styles.search}><Ionicons name="search-outline" size={16} color="#24D4C2" /><TextInput value={query} onChangeText={setQuery} placeholder="Search..." placeholderTextColor="#91B9B3" style={styles.searchInput} /></View>
    <Text style={styles.count}>{todayCount} trips today</Text>
    {loading ? <View style={styles.loading}><ActivityIndicator color="#20D6C4" /></View> : filtered.length ? filtered.map((trip) => <RecentTripCard key={trip.trip_id} trip={trip} />) : <View style={styles.empty}><Ionicons name="map-outline" size={28} color="#28D8C6" /><Text style={styles.emptyText}>No matching trips found.</Text></View>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#003F3A' }, content: { paddingHorizontal: 25, paddingTop: 12, paddingBottom: 20 }, titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { color: '#FFF', fontSize: 21, fontWeight: '700' }, search: { height: 42, borderRadius: 22, backgroundColor: '#126259', marginTop: 25, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#23766C' }, searchInput: { flex: 1, color: '#FFF', fontSize: 12 }, count: { color: '#25D6C4', fontSize: 10, marginVertical: 15 }, loading: { paddingTop: 50 }, empty: { alignItems: 'center', gap: 8, paddingTop: 55 }, emptyText: { color: '#A5CCC6', fontSize: 12 } });
