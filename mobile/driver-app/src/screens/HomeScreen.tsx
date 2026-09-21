import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDailySummary, getTripLogs, type DriverDailySummary, type DriverTrip } from '@/api/tripsAPI';
import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import RecentTripCard from '@/components/RecentTripCard';
import { NotificationBell } from '@/components/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';

type IconName = keyof typeof Ionicons.glyphMap;

export default function HomeScreen() {
  const { firstName } = useAuth();
  const [recentTrips, setRecentTrips] = useState<DriverTrip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState(false);
  const [summary, setSummary] = useState<DriverDailySummary | null>(null);
  const [currentDispatch, setCurrentDispatch] = useState<CurrentDispatch | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'connected' | 'unavailable' | 'denied'>('checking');

  const loadRecentTrips = useCallback(async () => {
    setIsLoadingTrips(true);
    setTripError(false);
    try {
      const trips = await getTripLogs();
      setRecentTrips(trips.slice(0, 3));
    } catch {
      setTripError(true);
    } finally {
      setIsLoadingTrips(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getDailySummary());
    } catch {
      setSummary(null);
    }
  }, []);

  const loadCurrentDispatch = useCallback(async () => {
    try {
      setCurrentDispatch(await getCurrentDispatch());
    } catch {
      setCurrentDispatch(null);
    }
  }, []);

  const checkGpsStatus = useCallback(async (requestPermission = false) => {
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' && requestPermission && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        setGpsStatus('denied');
        return;
      }

      setGpsStatus(await Location.hasServicesEnabledAsync() ? 'connected' : 'unavailable');
    } catch {
      setGpsStatus('unavailable');
    }
  }, []);

  const handleGpsPress = useCallback(() => {
    if (gpsStatus === 'denied') {
      void checkGpsStatus(true).then(() => {
        // A permanently denied permission can only be changed in device settings.
        void Location.getForegroundPermissionsAsync().then((permission) => {
          if (permission.status !== 'granted' && !permission.canAskAgain) void Linking.openSettings();
        });
      });
      return;
    }
    void checkGpsStatus(true);
  }, [checkGpsStatus, gpsStatus]);

  useEffect(() => {
    void loadRecentTrips();
    void loadSummary();
    void loadCurrentDispatch();
    // This displays the platform location-permission prompt on first use.
    void checkGpsStatus(true);
  }, [checkGpsStatus, loadCurrentDispatch, loadRecentTrips, loadSummary]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
          <View><Text style={styles.welcome}>Welcome Back, {firstName || 'Driver'} 👋</Text><Text style={styles.subtitle}>Ready for your ride today?</Text></View>
          <View style={styles.topActions}>
            <NotificationBell />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.summaryRow}>
          <SummaryCard icon="flag-outline" iconColor="#27E0D2" label="Trips Completed" value={summary?.trips_completed} variant="teal" />
          <SummaryCard icon="document-text-outline" iconColor="#FFAD0A" label="Incidents Reported" value={summary?.incidents_reported} variant="amber" />
        </View>

        <View style={styles.divider} />
        <View style={styles.assignmentHeader}><Text style={styles.assignmentTitle}>Today’s Assignment</Text><View style={styles.datePill}><Ionicons name="calendar-outline" size={12} color="#26D5C4" /><Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</Text></View></View>
        <View style={styles.assignmentCard}>
          <AssignmentStop title={currentDispatch?.route_label?.split('↔')[0]?.trim() || '--'} />
          <Ionicons name="swap-horizontal" size={28} color="#6CC3D4" />
          <AssignmentStop title={currentDispatch?.route_label?.split('↔')[1]?.trim() || '--'} />
        </View>
        <View style={styles.assignmentFoot}><Detail icon="car-sport-outline" label={currentDispatch?.vehicle_plate || '--'} /><Pressable onPress={handleGpsPress} style={styles.gpsInline}><View style={[styles.gpsDot, gpsStatus !== 'connected' && styles.gpsDotInactive]} /><Text style={styles.gpsText}>GPS Status: {gpsStatus === 'connected' ? 'Connected' : gpsStatus === 'checking' ? 'Checking…' : 'Unavailable'}</Text></Pressable></View>

        <View style={styles.divider} />
        <View style={styles.recentHeader}><Text style={styles.sectionTitle}>Trips Overview</Text></View>

        {isLoadingTrips ? (
          <View style={styles.emptyTrips}><ActivityIndicator color="#2DD4BF" /><Text style={styles.emptyTripsText}>Loading recent trips…</Text></View>
        ) : tripError ? (
          <EmptyTrips icon="cloud-offline-outline" message="Unable to load recent trips." />
        ) : recentTrips.length === 0 ? (
          <EmptyTrips icon="map-outline" message="No trips recorded yet." />
        ) : (
          recentTrips.map((trip) => <RecentTripCard key={trip.trip_id} trip={trip} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ icon, label }: { icon: IconName; label: string }) {
  return <View style={styles.detail}><Ionicons name={icon} size={13} color="#A9D1CC" /><Text style={styles.detailText}>{label}</Text></View>;
}

function AssignmentStop({ title }: { title: string }) {
  return <View style={styles.stop}><View style={styles.stopIcon}><Ionicons name="location-outline" size={22} color="#25D2C0" /></View><Text style={styles.stopText}>{title}</Text></View>;
}

function SummaryCard({ icon, iconColor, label, value, variant }: { icon: IconName; iconColor: string; label: string; value: number | undefined; variant: 'teal' | 'amber' }) {
  return (
    <View style={[styles.summaryCard, variant === 'teal' ? styles.tealCard : styles.amberCard]}>
      <Ionicons name={icon} size={41} color={iconColor} />
      <View><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value ?? '—'}</Text></View>
    </View>
  );
}

function EmptyTrips({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View style={styles.emptyTrips}>
      <Ionicons name={icon} size={34} color="#2DD4BF" />
      <Text style={styles.emptyTripsText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#042F2E' },
  content: { paddingHorizontal: 25, paddingTop: 13, paddingBottom: 30 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtitle: { color: '#B6D7D2', fontSize: 10, marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 20 },
  welcome: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  driverDetails: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 11 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { color: '#A9D1CC', fontSize: 10 },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#57D561' },
  sectionTitle: { color: '#B9E2DC', fontSize: 12, fontWeight: '700', marginTop: 36 },
  summaryRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  summaryCard: { flexDirection: 'row', flex: 1, alignItems: 'center', gap: 11, padding: 11, minHeight: 54, borderRadius: 14, borderWidth: 1 },
  tealCard: { backgroundColor: '#106A67', borderColor: '#28A79E' },
  amberCard: { backgroundColor: '#3A300E', borderColor: '#CE9100' },
  summaryLabel: { color: '#A9D1CC', fontSize: 11, fontWeight: '600', lineHeight: 14 },
  summaryValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', lineHeight: 28 },
  gpsPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 9, paddingVertical: 5, marginTop: 13, borderRadius: 12, backgroundColor: 'rgba(17, 105, 72, 0.55)' },
  gpsPillInactive: { backgroundColor: 'rgba(116, 82, 18, 0.55)' },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#41EA43', shadowColor: '#41EA43', shadowOpacity: 0.8, shadowRadius: 4 },
  gpsDotInactive: { backgroundColor: '#FFAD0A', shadowColor: '#FFAD0A' },
  gpsText: { color: '#C0FFF8', fontSize: 9, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(169, 209, 204, 0.48)', marginTop: 18, marginBottom: 14 },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignmentTitle: { color: '#DDF8F4', fontSize: 12, fontWeight: '700' },
  datePill: { flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#087A72', borderRadius: 6 },
  dateText: { color: '#D3FFFA', fontSize: 8 },
  assignmentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 },
  stop: { width: 104, minHeight: 64, backgroundColor: '#034F49', borderRadius: 9, alignItems: 'center', justifyContent: 'center', padding: 6 },
  stopIcon: { marginBottom: 2 },
  stopText: { color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  assignmentFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  gpsInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  emptyTrips: { minHeight: 144, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(8, 97, 88, 0.62)' },
  emptyTripsText: { color: '#A9D1CC', fontSize: 13 },
});
