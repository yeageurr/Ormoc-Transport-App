import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { endTrip, getTripLogs, startTrip, type DriverTrip, type Trip } from '@/api/tripsAPI';
import DriverMap from '@/components/DriverMap';
import { useDriverLocation } from '@/hooks/useDriverLocation';

function formatElapsed(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes} min${seconds ? ` ${seconds} sec` : ''}`;
}

function formatAddress(address: Location.LocationGeocodedAddress) {
  const city = formatCity(address.city?.trim());
  const barangay = address.district?.trim();
  if (barangay && !isPlusCode(barangay)) return `Barangay ${barangay}${city ? `, ${city}` : ''}`;
  return city && !isPlusCode(city) ? `Barangay unavailable, ${city}` : '';
}

function formatCity(city?: string) {
  if (city && /^ormoc(?: city)?$/i.test(city)) return 'Ormoc City';
  return city;
}

function isPlusCode(value: string) {
  const leadingPart = value.split(',')[0].trim();
  return /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i.test(leadingPart);
}

async function resolveLocationAddress(latitude: number, longitude: number) {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (token) {
    try {
      const query = new URLSearchParams({
        longitude: String(longitude),
        latitude: String(latitude),
        types: 'address,street,neighborhood,locality,district,place',
        country: 'ph',
        limit: '1',
        access_token: token,
      });
      const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${query.toString()}`);
      if (response.ok) {
        const data = await response.json() as {
          features?: Array<{
            properties?: {
              name?: string;
              feature_type?: string;
              context?: {
                neighborhood?: { name?: string };
                locality?: { name?: string };
                district?: { name?: string };
                place?: { name?: string };
              };
            };
          }>;
        };
        const properties = data.features?.[0]?.properties;
        const city = formatCity(
          properties?.context?.place?.name
            || (properties?.feature_type === 'place' ? properties.name : undefined),
        );
        const locality = properties?.context?.locality?.name;
        const barangay = [locality, properties?.context?.neighborhood?.name, properties?.context?.district?.name]
          .find((part) => part && part !== city && !isPlusCode(part))
          || (properties?.feature_type === 'locality' && properties.name !== city ? properties.name : undefined);
        if (barangay && city) return `Barangay ${barangay}, ${city}`;
        if (barangay) return `Barangay ${barangay}`;
        if (city) return `Barangay unavailable, ${city}`;
      }
    } catch {
      // Fall back to the device geocoder if Mapbox is temporarily unavailable.
    }
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    return results[0] ? formatAddress(results[0]) : '';
  } catch {
    return '';
  }
}

export default function RecordTripScreen() {
  const [dispatch, setDispatch] = useState<CurrentDispatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [locationAddress, setLocationAddress] = useState('Finding nearby address…');
  const location = useDriverLocation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lastGeocodeRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const geocodeRequestRef = useRef(0);

  const loadDispatch = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setMessage(null);
    try {
      const currentDispatch = await getCurrentDispatch();
      setDispatch(currentDispatch);
      const trips: DriverTrip[] = await getTripLogs();
      const inProgressTrip = trips.find((trip) => !trip.is_complete);
      setActiveTrip(inProgressTrip ?? null);
    } catch {
      setMessage('Unable to refresh your trip. Check your connection and try again.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadDispatch(); }, [loadDispatch]);
  useEffect(() => {
    const interval = setInterval(() => { void loadDispatch(false); }, 10000);
    return () => clearInterval(interval);
  }, [loadDispatch]);
  useEffect(() => {
    if (!activeTrip) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeTrip]);
  useEffect(() => {
    if (!location) return;
    const previous = lastGeocodeRef.current;
    if (previous && Date.now() - previous.at < 30000) return;

    lastGeocodeRef.current = { latitude: location.latitude, longitude: location.longitude, at: Date.now() };
    const requestId = ++geocodeRequestRef.current;
    setLocationAddress('Finding nearby address…');
    void resolveLocationAddress(location.latitude, location.longitude)
      .then((address) => {
        if (requestId === geocodeRequestRef.current) setLocationAddress(address || 'Address unavailable');
      });
  }, [location]);

  const handleStart = useCallback(async () => {
    if (!dispatch || isStarting) return;
    setIsStarting(true);
    setMessage(null);
    try {
      setActiveTrip(await startTrip(dispatch.dispatch_id));
      setNow(Date.now());
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Unable to start this trip. Check your connection and try again.');
    } finally {
      setIsStarting(false);
    }
  }, [dispatch, isStarting]);

  const handleFinish = useCallback(async () => {
    if (!activeTrip) return;
    setIsFinishing(true);
    try {
      const finished = await endTrip(String(activeTrip.trip_id));
      setActiveTrip(null);
      setFinishOpen(false);
      setMessage(`Trip completed${finished.trip_duration_minutes ? ` in ${Math.round(finished.trip_duration_minutes)} mins` : ''}.`);
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Unable to finish this trip.');
    } finally {
      setIsFinishing(false);
    }
  }, [activeTrip]);

  const routeLabel = dispatch?.route_label || 'Route not assigned';
  const isReady = dispatch?.vehicle_activity_status === 'loading';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#DCE8F0" />
      <DriverMap fullScreen routeGeometry={dispatch?.route_geometry} />

      <SafeAreaView style={styles.locationBanner} edges={['top']} pointerEvents="none">
        <View style={styles.locationHeading}>
          <Ionicons name="location" size={12} color="#009F94" />
          <Text style={styles.locationCaption}>{location ? 'Your location' : 'Waiting for your location'}</Text>
        </View>
        <Text style={styles.locationValue} numberOfLines={1}>
          {location ? locationAddress : 'Turn on location services'}
        </Text>
      </SafeAreaView>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.grabber} />
        {activeTrip ? (
          <>
            <Text style={styles.sheetTitle}>Trip in progress, take care!</Text>
            <Text style={styles.sheetSubtitle}>Stay alert on the road.</Text>
            <View style={styles.routeCard}>
              <Text style={styles.routeTitle} numberOfLines={1}>{routeLabel}</Text>
              <View style={styles.directionRow}>
                <Ionicons name="navigate-outline" size={12} color="#315B61" />
                <Text style={styles.directionText}>{activeTrip.status === 'returning' ? 'Returning' : 'Outgoing'}</Text>
              </View>
              <View style={styles.metricsRow}>
                <Metric icon="time-outline" value={formatElapsed(activeTrip.time_departed, now)} label="Elapsed time" />
                <Metric icon="speedometer-outline" value={location?.speedKph == null ? '— km/h' : `${Math.round(location.speedKph)} km/h`} label="Current speed" />
                <Metric icon="flag-outline" value="— min" label="Arriving in" />
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable accessibilityLabel="Pause trip is not available" onPress={() => setMessage('Pausing a trip is not available yet. GPS tracking remains active.')} style={styles.pauseButton}>
                <Text style={styles.pauseText}>Pause</Text>
              </Pressable>
              <Pressable onPress={() => setFinishOpen(true)} style={styles.endButton}>
                <Text style={styles.endText}>End Trip</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Heads up!</Text>
            <Text style={styles.sheetSubtitle}>{isReady ? 'Get ready for your next ride.' : 'Wait at the terminal until your vehicle is ready.'}</Text>
            <View style={styles.routeCard}>
              <Text style={styles.routeTitle} numberOfLines={1}>{routeLabel}</Text>
              <View style={styles.metricsRow}>
                <Metric icon="time-outline" value="— min" label="Trip time" />
                <Metric icon="map-outline" value="— km" label="Distance" />
                <Metric icon="navigate-outline" value="Outgoing" label="Direction" />
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityLabel="Go back"
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/tabs');
                }}
                style={styles.backButton}>
                <Ionicons name="arrow-back" size={21} color="#193B3D" />
              </Pressable>
              <Pressable onPress={() => void handleStart()} disabled={isLoading || isStarting || !dispatch || !isReady} style={[styles.startButton, (!dispatch || !isReady || isStarting) && styles.disabledButton]}>
                {isLoading || isStarting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.startText}>{isReady ? 'Start Trip' : dispatch ? 'Waiting for vehicle' : 'No dispatch today'}</Text>}
              </Pressable>
            </View>
          </>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <Modal transparent visible={finishOpen} animationType="slide" onRequestClose={() => setFinishOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFinishOpen(false)}>
          <Pressable style={[styles.confirmSheet, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalGrabber} />
            <Ionicons name="flag-outline" size={31} color="#009E91" />
            <Text style={styles.confirmTitle}>End this trip?</Text>
            <Text style={styles.confirmSubtitle}>Your current trip will be marked as completed.</Text>
            <Pressable disabled={isFinishing} onPress={() => void handleFinish()} style={styles.confirmButton}>
              {isFinishing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>End Trip</Text>}
            </Pressable>
            <Pressable onPress={() => setFinishOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Keep trip active</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Metric({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValueRow}><Ionicons name={icon} size={13} color="#284A50" /><Text style={styles.metricValue}>{value}</Text></View>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8E4E2' },
  locationBanner: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 14, paddingBottom: 9, backgroundColor: '#DCE8F0' },
  locationHeading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationCaption: { color: '#4D5B60', fontSize: 9 },
  locationValue: { maxWidth: '100%', marginTop: 1, color: '#27373B', fontSize: 12, fontWeight: '700' },
  sheet: { position: 'absolute', right: 0, bottom: 0, left: 0, paddingHorizontal: 12, paddingTop: 7, borderTopLeftRadius: 17, borderTopRightRadius: 17, backgroundColor: '#00665E' },
  grabber: { alignSelf: 'center', width: 46, height: 4, borderRadius: 3, marginBottom: 8, backgroundColor: '#77B8AE' },
  sheetTitle: { color: '#F4FFFC', fontSize: 14, fontWeight: '700' },
  sheetSubtitle: { marginTop: 2, marginBottom: 9, color: '#C0DFD9', fontSize: 9 },
  routeCard: { borderRadius: 5, paddingHorizontal: 13, paddingTop: 9, paddingBottom: 10, backgroundColor: '#F2F7F5' },
  routeTitle: { color: '#22383A', fontSize: 15, fontWeight: '700' },
  directionRow: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: 2 },
  directionText: { color: '#315B61', fontSize: 9, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginTop: 9 },
  metric: { flex: 1, alignItems: 'center', minWidth: 0 },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#E1E9EC' },
  metricValue: { color: '#2C454A', fontSize: 9, fontWeight: '700' },
  metricLabel: { maxWidth: '100%', marginTop: 3, color: '#63777A', fontSize: 8, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 7 },
  backButton: { width: 37, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B5D1CB', borderRadius: 5, backgroundColor: '#F3F8F6' },
  startButton: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#00A694' },
  disabledButton: { backgroundColor: '#789E98' },
  startText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pauseButton: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00A694', borderRadius: 5, backgroundColor: '#F2F7F5' },
  pauseText: { color: '#087C73', fontSize: 12, fontWeight: '700' },
  endButton: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#00A694' },
  endText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  message: { marginTop: 8, color: '#FFF3CC', fontSize: 10, lineHeight: 14 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  confirmSheet: { alignItems: 'center', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 14, backgroundColor: '#F2F7F5' },
  modalGrabber: { width: 48, height: 4, borderRadius: 3, marginBottom: 20, backgroundColor: '#A9BEBA' },
  confirmTitle: { marginTop: 7, color: '#153E3B', fontSize: 19, fontWeight: '800' },
  confirmSubtitle: { marginTop: 5, color: '#607772', fontSize: 12 },
  confirmButton: { height: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 21, borderRadius: 7, backgroundColor: '#00A694' },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  cancelButton: { height: 43, justifyContent: 'center' },
  cancelText: { color: '#087C73', fontWeight: '700' },
});
