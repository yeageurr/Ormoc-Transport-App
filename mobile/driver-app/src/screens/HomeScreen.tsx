import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDailySummary, getTripLogs, type DriverDailySummary, type DriverTrip } from '@/api/tripsAPI';
import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { NotificationBell } from '@/components/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';

type IconName = keyof typeof Ionicons.glyphMap;
type GpsStatus = 'checking' | 'connected' | 'unavailable' | 'denied';

export default function HomeScreen() {
  const router = useRouter();
  const { fullName } = useAuth();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState(false);
  const [summary, setSummary] = useState<DriverDailySummary | null>(null);
  const [currentDispatch, setCurrentDispatch] = useState<CurrentDispatch | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('checking');

  const loadTrips = useCallback(async () => {
    setIsLoadingTrips(true);
    setTripError(false);
    try {
      setTrips(await getTripLogs());
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
        void Location.getForegroundPermissionsAsync().then((permission) => {
          if (permission.status !== 'granted' && !permission.canAskAgain) void Linking.openSettings();
        });
      });
      return;
    }
    void checkGpsStatus(true);
  }, [checkGpsStatus, gpsStatus]);

  useEffect(() => {
    void loadTrips();
    void loadSummary();
    void loadCurrentDispatch();
    void checkGpsStatus(true);
  }, [checkGpsStatus, loadCurrentDispatch, loadSummary, loadTrips]);

  const todayTrips = useMemo(
    () => trips.filter((trip) => trip.is_complete && trip.time_arrived && isTodayInManila(trip.time_arrived)),
    [trips],
  );
  const averageSpeed = average(todayTrips.map((trip) => trip.average_speed_km));
  const averageDuration = average(todayTrips.map((trip) => trip.trip_duration_minutes));
  const routeStops = currentDispatch?.route_label?.split('↔').map((stop) => stop.trim());
  const firstName = fullName?.trim().split(/\s+/)[0] || 'Driver';
  const tripCount = summary?.trips_completed ?? todayTrips.length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topBar}>
            <View style={styles.greetingCopy}>
              <Text style={styles.greeting}>Welcome back, {firstName}!</Text>
              <Text style={styles.greetingSubtitle}>Ready for your ride today?</Text>
            </View>
            <NotificationBell />
          </View>

          <View style={styles.assignmentCard}>
            <View style={styles.assignmentTitleRow}>
              <Text style={styles.assignmentEyebrow}>YOUR ROUTE TODAY</Text>
              <View style={styles.assignmentPill}>
                <View style={styles.assignmentDot} />
                <Text style={styles.assignmentPillText}>{currentDispatch ? 'Assigned' : 'No assignment'}</Text>
              </View>
            </View>
            <View style={styles.routeStops}>
              <Text numberOfLines={1} style={styles.routeStop}>{routeStops?.[0] || 'Route not assigned'}</Text>
              <Ionicons name="swap-horizontal" size={20} color="#89DAD0" />
              <Text numberOfLines={1} style={[styles.routeStop, styles.destination]}>{routeStops?.[1] || '—'}</Text>
            </View>
            <View style={styles.assignmentDetails}>
              <VehicleDetail icon="car-sport-outline" text={currentDispatch?.vehicle_plate || 'No vehicle'} />
              <View style={styles.detailDivider} />
              <VehicleDetail icon="time-outline" text={averageDuration == null ? '— min avg. trip' : `${Math.round(averageDuration)} min avg. trip`} />
            </View>
            <Pressable onPress={handleGpsPress} accessibilityRole="button" style={styles.gpsStatus}>
              <View style={[styles.gpsDot, gpsStatus !== 'connected' && styles.gpsDotInactive]} />
              <Text style={styles.gpsStatusText}>{gpsStatusLabel(gpsStatus)}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.dashboardBody}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start Trip"
            onPress={() => router.navigate('/tabs/record-trip')}
            style={({ pressed }) => [styles.startTripButton, pressed && styles.pressed]}
          >
            <View style={styles.startTripIcon}><Ionicons name="navigate" size={21} color="#FFFFFF" /></View>
            <Text style={styles.startTripLabel}>Start Trip</Text>
          </Pressable>

          <View style={styles.metricsRow}>
            <Metric value="— km" label="Distance Today" />
            <View style={styles.metricDivider} />
            <Metric value={String(tripCount)} label="Trips Completed" />
            <View style={styles.metricDivider} />
            <Metric value={averageSpeed == null ? '—' : `${Math.round(averageSpeed)} km/h`} label="Avg. Travel Speed" />
          </View>

          <View style={styles.queueCard}>
            <View style={styles.queueIcon}><Ionicons name="people-outline" size={18} color="#137B70" /></View>
            <Text style={styles.queueLabel}>Passengers in queue</Text>
            <Text style={styles.queueValue}>—</Text>
          </View>

          <View style={styles.recentHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Trips</Text>
              <Text style={styles.sectionSubtitle}>Your latest activity</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/tabs/trip-logs')} style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={14} color="#137B70" />
            </Pressable>
          </View>

          {isLoadingTrips ? (
            <View style={styles.emptyTrips}><ActivityIndicator color="#137B70" /><Text style={styles.emptyTripsText}>Loading recent trips…</Text></View>
          ) : tripError ? (
            <EmptyTrips icon="cloud-offline-outline" message="Unable to load recent trips." />
          ) : trips.length === 0 ? (
            <EmptyTrips icon="map-outline" message="No trips recorded yet." />
          ) : (
            trips.slice(0, 3).map((trip) => <HomeTripCard key={trip.trip_id} trip={trip} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function VehicleDetail({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.vehicleDetail}>
      <Ionicons name={icon} size={13} color="#B7DDD8" />
      <Text numberOfLines={1} style={styles.vehicleDetailText}>{text}</Text>
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function HomeTripCard({ trip }: { trip: DriverTrip }) {
  const isReturning = trip.status === 'returning';
  const departed = new Date(trip.time_departed);
  const time = departed.toLocaleTimeString(undefined, { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  const duration = trip.trip_duration_minutes == null ? (trip.is_complete ? '—' : 'In progress') : `${Math.round(trip.trip_duration_minutes)} mins`;
  const speed = trip.average_speed_km == null ? '— km/h' : `${Math.round(trip.average_speed_km)} km/h`;

  return (
    <View style={styles.tripCard}>
      <View style={[styles.tripDirectionIcon, isReturning ? styles.returningIcon : styles.outgoingIcon]}>
        <Ionicons name={isReturning ? 'return-down-back' : 'navigate'} size={16} color={isReturning ? '#1B9B62' : '#3478DC'} />
      </View>
      <View style={styles.tripCopy}>
        <Text style={styles.tripDirection}>{isReturning ? 'Returning' : 'Outgoing'}</Text>
        <Text numberOfLines={1} style={styles.tripTime}>{time} · {trip.route_label || 'Assigned route'}</Text>
      </View>
      <View style={styles.tripMetrics}>
        <Text style={styles.tripMetricText}>{duration}</Text>
        <Text style={styles.tripMetricText}>{speed}</Text>
      </View>
    </View>
  );
}

function EmptyTrips({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View style={styles.emptyTrips}>
      <Ionicons name={icon} size={25} color="#70A9A2" />
      <Text style={styles.emptyTripsText}>{message}</Text>
    </View>
  );
}

function average(values: (number | null)[]) {
  const availableValues = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (availableValues.length === 0) return null;
  return availableValues.reduce((sum, value) => sum + value, 0) / availableValues.length;
}

function isTodayInManila(timestamp: string) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const tripDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
  return tripDay === today;
}

function gpsStatusLabel(status: GpsStatus) {
  if (status === 'connected') return 'GPS connected';
  if (status === 'checking') return 'Checking GPS';
  if (status === 'denied') return 'GPS permission needed · tap to enable';
  return 'GPS unavailable · tap to retry';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E5EBF4' },
  content: { paddingBottom: 20 },
  header: { paddingHorizontal: 18, paddingTop: 9, paddingBottom: 17, backgroundColor: '#064F49', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greetingCopy: { flex: 1, paddingRight: 12 },
  greeting: { color: '#F5FFFD', fontSize: 17, fontWeight: '800' },
  greetingSubtitle: { marginTop: 3, color: '#B8D9D5', fontSize: 10 },
  assignmentCard: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 9, borderRadius: 12, backgroundColor: '#0A7168' },
  assignmentTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignmentEyebrow: { color: '#BFE9E4', fontSize: 8, fontWeight: '700', letterSpacing: 0.7 },
  assignmentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 9, backgroundColor: 'rgba(2, 45, 41, 0.35)' },
  assignmentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7EF2AE' },
  assignmentPillText: { color: '#D9F8F3', fontSize: 7, fontWeight: '600' },
  routeStops: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  routeStop: { flex: 1, color: '#F4FFFD', fontSize: 11, fontWeight: '700' },
  destination: { textAlign: 'right' },
  assignmentDetails: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 },
  vehicleDetail: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleDetailText: { color: '#D2ECE8', fontSize: 8 },
  detailDivider: { width: 1, height: 16, backgroundColor: 'rgba(218, 248, 242, 0.35)' },
  gpsStatus: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 9 },
  gpsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#54E18D' },
  gpsDotInactive: { backgroundColor: '#FFC15E' },
  gpsStatusText: { color: '#C2E4DF', fontSize: 8 },
  dashboardBody: { paddingHorizontal: 16, paddingBottom: 10 },
  startTripButton: { alignSelf: 'center', alignItems: 'center', marginTop: 10, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 1 },
  startTripIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#138B58', shadowColor: '#087342', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  startTripLabel: { marginTop: 3, color: '#183A36', fontSize: 9, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 53, marginTop: 1, marginBottom: 12 },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  metricValue: { color: '#203D3B', fontSize: 13, fontWeight: '800' },
  metricLabel: { marginTop: 2, color: '#667A79', fontSize: 7, textAlign: 'center' },
  metricDivider: { width: 1, height: 29, backgroundColor: '#AAB8C3' },
  queueCard: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FFFFFF', shadowColor: '#42566B', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  queueIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#E4F5F0' },
  queueLabel: { flex: 1, color: '#334B49', fontSize: 9, fontWeight: '600' },
  queueValue: { color: '#314744', fontSize: 13, fontWeight: '800' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  sectionTitle: { color: '#243E3B', fontSize: 13, fontWeight: '800' },
  sectionSubtitle: { color: '#778987', fontSize: 8, marginTop: 2 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  seeAllText: { color: '#137B70', fontSize: 9, fontWeight: '700' },
  tripCard: { minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 7, backgroundColor: '#FFFFFF', shadowColor: '#42566B', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tripDirectionIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  outgoingIcon: { backgroundColor: '#E2EDFF' },
  returningIcon: { backgroundColor: '#E1F5E9' },
  tripCopy: { flex: 1, minWidth: 0 },
  tripDirection: { color: '#344A48', fontSize: 9, fontWeight: '700' },
  tripTime: { color: '#798987', fontSize: 7, marginTop: 2 },
  tripMetrics: { alignItems: 'flex-end', gap: 2 },
  tripMetricText: { color: '#566A68', fontSize: 7 },
  emptyTrips: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: '#FFFFFF' },
  emptyTripsText: { color: '#718481', fontSize: 9 },
});
