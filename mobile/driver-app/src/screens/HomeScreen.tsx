import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTripLogs, type DriverTrip } from '@/api/tripsAPI';
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
    void loadCurrentDispatch();
    void checkGpsStatus(true);
  }, [checkGpsStatus, loadCurrentDispatch, loadTrips]);

  const todayTrips = useMemo(
    () => trips.filter((trip) => trip.is_complete && trip.time_arrived && isTodayInManila(trip.time_arrived)),
    [trips],
  );
  const averageSpeed = average(todayTrips.map((trip) => trip.average_speed_km));
  const averageDuration = average(todayTrips.map((trip) => trip.trip_duration_minutes));
  const distanceToday = todayTrips.reduce((total, trip) => total + (trip.route_distance_km ?? 0), 0);
  const routeStops = currentDispatch?.route_label?.split('↔').map((stop) => stop.trim());
  const firstName = fullName?.trim().split(/\s+/)[0] || 'Driver';
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

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

          <View style={styles.assignmentTitleRow}>
            <Text style={styles.assignmentEyebrow}>Your route today</Text>
            <View style={styles.assignmentDate}>
              <Ionicons name="calendar" size={16} color="#89DAD0" />
              <Text style={styles.dateText}>
                {todayLabel}
              </Text>
            </View>
          </View>
            {currentDispatch ? 
              <View style={styles.assignmentCard}>
                <View style={styles.routeStops}>
                  <Text numberOfLines={1} style={styles.routeStop}>{routeStops?.[0] || 'Route not assigned'}</Text>
                  <Ionicons name="swap-horizontal" size={20} color="#89DAD0" />
                  <Text numberOfLines={1} style={[styles.routeStop, styles.destination]}>{routeStops?.[1] || '—'}</Text>
                </View>

                <View style={styles.assignmentDetails}>
                  <View style={styles.assignmentDiv}>
                    <Text style={styles.assignmentValue}>{currentDispatch?.vehicle_plate}</Text>
                    <Text style={styles.assignmentLabel}>Vehicle Plate No.</Text>
                  </View>
                  <View style={styles.assignmentDiv}>
                    <Text style={styles.assignmentValue}>
                      {averageDuration == null ? '0' : `${Math.round(averageDuration)}`}
                    </Text>
                    <Text style={styles.assignmentLabel}>Average Trip Duration</Text>
                  </View>
                </View>
              </View>
              :
              <View style={styles.assignmentNull}>
                <Text style={styles.assignmentNullText}>No trip assigned at the moment.</Text>
              </View>
            }

          <Pressable onPress={handleGpsPress} accessibilityRole="button" style={styles.gpsStatus}>
            <View style={[styles.gpsDot, gpsStatus !== 'connected' && styles.gpsDotInactive]} />
            <Text style={styles.gpsStatusText}>{gpsStatusLabel(gpsStatus)}</Text>
          </Pressable>
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
            <Metric value={`${distanceToday.toFixed(1)} km`} caption="Distance Today" />
            <View style={styles.metricDivider} />
            <Metric value={String(todayTrips.length)} caption="Trips Completed" />
            <View style={styles.metricDivider} />
            <Metric value={averageSpeed == null ? '0 km/h' : `${Math.round(averageSpeed)} km/h`} caption="Avg. Travel Speed" />
          </View>

          <View style={styles.queueCard}>
            <View style={styles.queueIcon}><Ionicons name="people-outline" size={18} color="#137B70" /></View>
            <Text style={styles.queueLabel}>Passengers in queue</Text>
            <Text style={styles.queueValue}>—</Text>
          </View>

          <View style={styles.recentHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Trips</Text>
            </View>
          </View>

          {isLoadingTrips ? (
            <View style={styles.emptyTrips}><ActivityIndicator color="#137B70" /><Text style={styles.emptyTripsText}>Loading recent trips…</Text></View>
          ) : tripError ? (
            <EmptyTrips icon="cloud-offline-outline" message="Unable to load recent trips." />
          ) : todayTrips.length === 0 ? (
            <EmptyTrips icon="file-tray-outline" message="No trips completed today." />
          ) : (
            todayTrips.map((trip) => <HomeTripCard key={trip.trip_id} trip={trip} />)
          )}
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/tabs/trip-logs')} style={styles.seeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={15} color="#137B70" />
          </Pressable>
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

function Metric({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={styles.metric}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
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
      <Ionicons name={icon} size={29} color="#70A9A2" />
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
  header: { paddingHorizontal: 18, paddingTop: 9, paddingBottom: 17, backgroundColor: '#0B423D', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greetingCopy: { flex: 1, paddingRight: 12 },
  greeting: { color: '#F5FFFD', fontSize: 24, fontWeight: '800' },
  greetingSubtitle: { marginTop: 3, color: '#B8D9D5', fontSize: 14 },
  assignmentCard: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 9, borderRadius: 5, backgroundColor: '#0A7168', alignItems: 'center', justifyContent: 'center'},
  assignmentTitleRow: { flexDirection: 'row', flex: 1, height: 26, justifyContent: 'space-between', alignItems: 'center' },
  assignmentEyebrow: { color: '#BFE9E4', fontSize: 13, fontWeight: '500' },
  assignmentDate: { display: 'flex', flexDirection: 'row', width: 85, justifyContent: 'space-between', alignItems: 'center'},
  dateText: {color: '#BFE9E4', fontSize: 13, fontWeight: '500', fontStyle: 'italic' }, 
  routeStops: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  routeStop: { flex: 1, color: '#F4FFFD', fontSize: 13, fontWeight: '700',  },
  destination: { textAlign: 'center' },

  assignmentDetails: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 13 },
  assignmentNull: {backgroundColor: '#0A7168', borderRadius: 5, height: 94, alignItems: 'center', justifyContent: 'center'},
  assignmentNullText: {color: '#fff', fontWeight: '500', fontSize: 18, opacity: .5},
  assignmentDiv: {flexDirection: 'column', alignItems: 'center', justifyContent: 'center'},
  assignmentValue: {fontWeight: '500', fontSize: 20, color: '#FFFFFF'},
  assignmentLabel: {fontSize: 9, color: '#B3D5FF'},

  vehicleDetail: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleDetailText: { color: '#D2ECE8', fontSize: 8 },
  detailDivider: { width: 1, height: 16, backgroundColor: 'rgba(218, 248, 242, 0.35)' },
  gpsStatus: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 9 },
  gpsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#54E18D' },
  gpsDotInactive: { backgroundColor: '#FFC15E' },
  gpsStatusText: { color: '#C2E4DF', fontSize: 10 },
  dashboardBody: { paddingHorizontal: 16, paddingBottom: 10 },
  startTripButton: { alignSelf: 'center', alignItems: 'center', marginTop: 10, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 1 },
  startTripIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#138B58', shadowColor: '#087342', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  startTripLabel: { marginTop: 3, color: '#183A36', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 61, marginTop: 1, marginBottom: 12 },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  metricValue: { color: '#203D3B', fontSize: 20, fontWeight: '800' },
  metricCaption: { marginTop: 4, color: '#667A79', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  metricDivider: { width: 1, height: 29, backgroundColor: '#AAB8C3' },
  queueCard: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FFFFFF', shadowColor: '#42566B', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  queueIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#E4F5F0' },
  queueLabel: { flex: 1, color: '#334B49', fontSize: 14, fontWeight: '600' },
  queueValue: { color: '#314744', fontSize: 15, fontWeight: '800' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  sectionTitle: { color: '#243E3B', fontSize: 15, fontWeight: '800' },
  sectionSubtitle: { color: '#778987', fontSize: 8, marginTop: 2 },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, alignSelf: 'center', paddingVertical: 10 },
  seeAllText: { color: '#137B70', fontSize: 11, fontWeight: '700', fontStyle: 'italic' },
  tripCard: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 7, backgroundColor: '#FFFFFF', shadowColor: '#42566B', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tripDirectionIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  outgoingIcon: { backgroundColor: '#E2EDFF' },
  returningIcon: { backgroundColor: '#E1F5E9' },
  tripCopy: { flex: 1, minWidth: 0 },
  tripDirection: { color: '#344A48', fontSize: 11, fontWeight: '700' },
  tripTime: { color: '#798987', fontSize: 9, marginTop: 3 },
  tripMetrics: { alignItems: 'flex-end', gap: 2 },
  tripMetricText: { color: '#566A68', fontSize: 9 },
  emptyTrips: { minHeight: 92, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFFFFF' },
  emptyTripsText: { color: '#718481', fontSize: 12, textAlign: 'center' },
});
