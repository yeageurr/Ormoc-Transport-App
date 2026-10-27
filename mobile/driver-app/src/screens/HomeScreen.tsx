import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTripLogs, type DriverTrip } from '@/api/tripsAPI';
import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { getCurrentDriverReservation, type DriverReservation } from '@/api/queueAPI';
import { getPassengerQueueCount } from '@/api/passengerQueueAPI';
import { NotificationBell } from '@/components/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { useDriverPassengerQueueUpdates } from '@/hooks/useWebsocket';

type IconName = keyof typeof Ionicons.glyphMap;
type GpsStatus = 'checking' | 'connected' | 'unavailable' | 'denied';

export default function HomeScreen() {
  const router = useRouter();
  const { fullName, refreshUser } = useAuth();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState(false);
  const [currentDispatch, setCurrentDispatch] = useState<CurrentDispatch | null>(null);
  const [currentReservation, setCurrentReservation] = useState<DriverReservation | null>(null);
  const [passengerQueueCount, setPassengerQueueCount] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('checking');
  const [refreshing, setRefreshing] = useState(false);

  const loadTrips = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoadingTrips(true);
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

  const loadCurrentReservation = useCallback(async () => {
    try {
      setCurrentReservation(await getCurrentDriverReservation());
    } catch {
      setCurrentReservation(null);
    }
  }, []);

  const loadPassengerQueueCount = useCallback(async () => {
    try {
      setPassengerQueueCount(await getPassengerQueueCount());
    } catch {
      setPassengerQueueCount(null);
    }
  }, []);

  useDriverPassengerQueueUpdates(useCallback((count: number) => {
    setPassengerQueueCount(count);
  }, []));

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

  const refreshHome = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadTrips(false),
      loadCurrentDispatch(),
      loadCurrentReservation(),
      loadPassengerQueueCount(),
      checkGpsStatus(),
      refreshUser().catch(() => undefined),
    ]);
    setRefreshing(false);
  }, [checkGpsStatus, loadCurrentDispatch, loadCurrentReservation, loadPassengerQueueCount, loadTrips, refreshUser]);

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

  useFocusEffect(useCallback(() => {
    void loadTrips();
    void loadCurrentDispatch();
    void loadCurrentReservation();
    void loadPassengerQueueCount();
    const refreshQueueCount = setInterval(() => void loadPassengerQueueCount(), 15_000);
    return () => clearInterval(refreshQueueCount);
  }, [loadCurrentDispatch, loadCurrentReservation, loadPassengerQueueCount, loadTrips]));

  useEffect(() => { void checkGpsStatus(true); }, [checkGpsStatus]);

  const todayTrips = useMemo(
    () => trips.filter((trip) => trip.is_complete && trip.time_arrived && isTodayInManila(trip.time_arrived)),
    [trips],
  );
  const averageSpeed = average(todayTrips.map((trip) => trip.average_speed_km));
  const distanceToday = todayTrips.reduce((total, trip) => total + (trip.distance_traveled_km ?? 0), 0);
  const queueStatusLabel = currentReservation
    ? currentReservation.queue_status === 'loading'
      ? 'Now Loading'
      : currentReservation.queue_status === 'on_queue'
        ? 'On Queue'
        : 'Awaiting Approval'
    : currentDispatch
      ? 'Ready to Reserve'
      : 'No Current Dispatch';
  const firstName = fullName?.trim().split(/\s+/)[0] || 'Driver';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshHome()}
            tintColor="#137B70"
            colors={['#137B70']}
          />
        )}
      >
        <View style={styles.header}>
          <View style={styles.topBar}>
            <View style={styles.greetingCopy}>
              <Text style={styles.greeting}>Welcome Back, {firstName}!</Text>
              <Text style={styles.greetingSubtitle}>Ready for your ride today?</Text>
            </View>
            <NotificationBell />
          </View>

          <View style={styles.queueSummaryCard}>
            <View style={styles.queueSummaryItem}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.queueSummaryValue}>{queueStatusLabel}</Text>
              <Text style={styles.queueSummaryCaption}>Queue Status</Text>
            </View>
            <View style={styles.queueSummaryDivider} />
            <View style={styles.queueSummaryItem}>
              <Text style={styles.queueSummaryValue}>{currentReservation?.queue_display || '—'}</Text>
              <Text style={styles.queueSummaryCaption}>Your Queue Number</Text>
            </View>
          </View>

          <Pressable onPress={handleGpsPress} accessibilityRole="button" style={styles.gpsStatus}>
            <View style={[styles.gpsDot, gpsStatus !== 'connected' && styles.gpsDotInactive]} />
            <Text style={styles.gpsStatusText}>{gpsStatusLabel(gpsStatus)}</Text>
          </Pressable>
        </View>

        <View style={styles.dashboardBody}>
          <View style={styles.quickActions}>
            <QuickAction
              label="Start Trip"
              icon="navigate"
              color="#078A17"
              onPress={() => router.navigate('/tabs/record-trip')}
            />
          </View>

          <View style={styles.metricsRow}>
            <Metric value={`${distanceToday.toFixed(1)} km`} caption="Total Distance Traveled" />
            <View style={styles.metricDivider} />
            <Metric value={String(todayTrips.length)} caption="Total Trips Accomplished" />
            <View style={styles.metricDivider} />
            <Metric value={averageSpeed == null ? '0 km/h' : `${Math.round(averageSpeed)} km/h`} caption="Average Travel Speed" />
          </View>

          <View style={styles.queueCard}>
            <View style={styles.queueIcon}><Ionicons name="people-outline" size={18} color="#137B70" /></View>
            <Text style={styles.queueLabel}>Passengers on queue</Text>
            <Text style={styles.queueValue}>{passengerQueueCount == null ? '—' : passengerQueueCount}</Text>
          </View>

          <View style={styles.recentTripsCard}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent Trips</Text>
              <Ionicons name="information-circle-outline" size={14} color="#667A79" />
            </View>

            {isLoadingTrips ? (
              <View style={styles.emptyTrips}><ActivityIndicator color="#137B70" /><Text style={styles.emptyTripsText}>Loading recent trips…</Text></View>
            ) : tripError ? (
              <EmptyTrips icon="cloud-offline-outline" message="Unable to load recent trips." />
            ) : todayTrips.length === 0 ? (
              <EmptyTrips icon="file-tray-outline" message="No trips completed today." />
            ) : (
              todayTrips.map((trip, index) => <HomeTripCard key={trip.trip_id} trip={trip} isLast={index === todayTrips.length - 1} />)
            )}
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/tabs/trip-logs')} style={styles.seeAll}>
              <Text style={styles.seeAllText}>View all trip logs</Text>
              <Ionicons name="chevron-forward" size={14} color="#111111" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ label, icon, color, onPress }: { label: string; icon: IconName; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={21} color="#FFFFFF" />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
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

function HomeTripCard({ trip, isLast }: { trip: DriverTrip; isLast: boolean }) {
  const isReturning = trip.status === 'returning';
  const departed = new Date(trip.time_departed);
  const time = departed.toLocaleTimeString(undefined, { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  const duration = trip.trip_duration_minutes == null ? (trip.is_complete ? '—' : 'In progress') : `${Math.round(trip.trip_duration_minutes)} mins`;
  const speed = trip.average_speed_km == null ? '— km/h' : `${Math.round(trip.average_speed_km)} km/h`;

  return (
    <View style={[styles.tripCard, isLast && styles.tripCardLast]}>
      <View style={[styles.tripDirectionIcon, isReturning ? styles.returningIcon : styles.outgoingIcon]}>
        <Ionicons name={isReturning ? 'return-down-back' : 'navigate'} size={16} color={isReturning ? '#1B9B62' : '#3478DC'} />
      </View>
      <View style={styles.tripCopy}>
        <Text style={styles.tripDirection}>{isReturning ? 'Returning' : 'Outgoing'}{trip.is_complete ? ' - Completed' : ' - In progress'}</Text>
        <Text numberOfLines={1} style={styles.tripTime}>{time} · {trip.route_label || 'Assigned route'}</Text>
      </View>
      <Text style={styles.tripMetrics}>{duration} · {speed}</Text>
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

const POPPINS = {
  "Light": 'Poppins_300Light',
  "Regular": 'Poppins_400Regular',
  "Medium": 'Poppins_500Medium',
  "SBold": 'Poppins_600SemiBold'
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D3DFEA' },
  content: { paddingBottom: 20 },
  header: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, backgroundColor: '#0B423D', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greetingCopy: { flex: 1, paddingRight: 12 },
  greeting: { color: '#F5FFFD', fontSize: 20, fontWeight: '800' },
  greetingSubtitle: { marginTop: 2, color: '#B8D9D5', fontSize: 11 },
  queueSummaryCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#0A7168' },
  queueSummaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  queueSummaryValue: { color: '#FFFFFF', fontSize: 13, lineHeight: 27, fontWeight: '700' },
  queueSummaryCaption: { color: '#D2ECE8', fontSize: 9, marginTop: 1 },
  queueSummaryDivider: { width: 1, height: 35, backgroundColor: 'rgba(218, 248, 242, 0.35)' },

  gpsStatus: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 9 },
  gpsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#54E18D' },
  gpsDotInactive: { backgroundColor: '#FFC15E' },
  gpsStatusText: { color: '#C2E4DF', fontSize: 10 },
  dashboardBody: { paddingHorizontal: 10, paddingBottom: 10 },
  quickActions: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', marginVertical: 25 },
  quickAction: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  quickActionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  quickActionLabel: { marginTop: 4, color: '#111111', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.7 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 61, marginTop: 0, marginBottom: 12 },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  metricValue: { color: '#203D3B', fontSize: 16, fontWeight: '800' },
  metricCaption: { marginTop: 3, color: '#435956', fontSize: 9, fontWeight: '500', textAlign: 'center' },
  metricDivider: { width: 1, height: 20, backgroundColor: '#AAB8C3' },
  queueCard: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#FFFFFF' },
  queueIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#E4F5F0' },
  queueLabel: { flex: 1, color: '#222222', fontSize: 12, fontWeight: '500' },
  queueValue: { color: '#222222', fontSize: 14, fontWeight: '600' },
  recentTripsCard: { minHeight: 280, marginTop: 14, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4, borderRadius: 8, backgroundColor: '#F9FBFD' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6, marginBottom: 6, padding: 4 },
  sectionTitle: { color: '#243E3B', fontSize: 15, fontWeight: '700' },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, alignSelf: 'center', paddingVertical: 10 },
  seeAllText: { color: '#222222', fontSize: 8, fontWeight: '500', fontStyle: 'italic' },
  tripCard: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 2, paddingHorizontal: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#AAB1B4' },
  tripCardLast: { borderBottomWidth: 0 },
  tripDirectionIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  outgoingIcon: { backgroundColor: '#E2EDFF' },
  returningIcon: { backgroundColor: '#E1F5E9' },
  tripCopy: { flex: 1, minWidth: 0 },
  tripDirection: { color: '#222222', fontSize: 14, fontWeight: '600' },
  tripTime: { color: '#555555', fontSize: 9, marginTop: 2, fontFamily: POPPINS.Light },
  tripMetrics: { maxWidth: 112, color: '#333333', fontSize: 10, textAlign: 'right' },
  emptyTrips: { minHeight: 145, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'transparent' },
  emptyTripsText: { color: '#718481', fontSize: 12, textAlign: 'center' },
});
