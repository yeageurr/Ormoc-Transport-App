import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, PanResponder, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
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

function formatTripDuration(minutes: number | null) {
  if (minutes == null) return '—';
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function formatTripTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
  const [selectedDirection, setSelectedDirection] = useState<Trip['status']>('outgoing');
  const [tripLogs, setTripLogs] = useState<DriverTrip[]>([]);
  const [finishOpen, setFinishOpen] = useState(false);
  const [completedTripSummary, setCompletedTripSummary] = useState<DriverTrip | null>(null);
  const [scanTicketOpen, setScanTicketOpen] = useState(false);
  const [scanActionMessage, setScanActionMessage] = useState<string | null>(null);
  const [directionPickerOpen, setDirectionPickerOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [locationAddress, setLocationAddress] = useState('Finding nearby address…');
  const [sheetHeight, setSheetHeight] = useState(302);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const location = useDriverLocation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lastGeocodeRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const geocodeRequestRef = useRef(0);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const gestureStartY = useRef(0);
  const collapsedOffset = Math.max(0, sheetHeight - 76);
  const sheetPanResponder = useMemo(() => PanResponder.create({
    // Capture vertical drags anywhere on the sheet, including over its buttons and route card.
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => {
      sheetTranslateY.stopAnimation((value) => { gestureStartY.current = value; });
    },
    onPanResponderMove: (_, gesture) => {
      const nextY = Math.max(0, Math.min(collapsedOffset, gestureStartY.current + gesture.dy));
      sheetTranslateY.setValue(nextY);
    },
    onPanResponderRelease: (_, gesture) => {
      const projectedY = gestureStartY.current + gesture.dy;
      const shouldCollapse = gesture.vy > 0.45 || (Math.abs(gesture.vy) <= 0.45 && projectedY > collapsedOffset / 2);
      const targetY = shouldCollapse ? collapsedOffset : 0;
      if (!shouldCollapse) setSheetCollapsed(false);
      Animated.spring(sheetTranslateY, {
        toValue: targetY,
        useNativeDriver: true,
        damping: 24,
        stiffness: 190,
        mass: 0.8,
      }).start(({ finished }) => {
        if (finished) setSheetCollapsed(shouldCollapse);
      });
    },
    onPanResponderTerminate: () => {
      const shouldCollapse = gestureStartY.current > collapsedOffset / 2;
      if (!shouldCollapse) setSheetCollapsed(false);
      Animated.spring(sheetTranslateY, {
        toValue: shouldCollapse ? collapsedOffset : 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 190,
        mass: 0.8,
      }).start(({ finished }) => {
        if (finished) setSheetCollapsed(shouldCollapse);
      });
    },
  }), [collapsedOffset, sheetTranslateY]);
  const contentOpacity = sheetTranslateY.interpolate({
    inputRange: [0, Math.max(1, collapsedOffset)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const loadDispatch = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setMessage(null);
    try {
      const currentDispatch = await getCurrentDispatch();
      setDispatch(currentDispatch);
      const trips: DriverTrip[] = await getTripLogs();
      setTripLogs(trips);
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
    if (activeTrip) setDirectionPickerOpen(false);
  }, [activeTrip]);
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
    if (isStarting || (selectedDirection === 'outgoing' && !dispatch)) return;
    setIsStarting(true);
    setMessage(null);
    try {
      setActiveTrip(await startTrip(selectedDirection === 'outgoing' ? dispatch?.dispatch_id ?? null : null, selectedDirection));
      setNow(Date.now());
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message
          || error?.response?.data?.detail
          || 'Unable to start this trip. Check your connection and try again.'
      );
    } finally {
      setIsStarting(false);
    }
  }, [dispatch, isStarting, selectedDirection]);

  const handleFinish = useCallback(async () => {
    if (!activeTrip) return;
    setIsFinishing(true);
    try {
      const finished = await endTrip(String(activeTrip.trip_id));
      const existingTrip = tripLogs.find((trip) => trip.trip_id === finished.trip_id);
      const completedTrip: DriverTrip = {
        ...finished,
        vehicle_plate: existingTrip?.vehicle_plate ?? dispatch?.vehicle_plate ?? null,
        route_label: existingTrip?.route_label ?? (finished.status === 'returning' ? 'Ormoc City Terminal' : dispatch?.route_label ?? null),
        route_distance_km: existingTrip?.route_distance_km ?? (finished.status === 'returning' ? null : dispatch?.route_distance_km ?? null),
      };
      setTripLogs((logs) => [completedTrip, ...logs.filter((trip) => trip.trip_id !== finished.trip_id)]);
      setActiveTrip(null);
      setFinishOpen(false);
      setCompletedTripSummary(completedTrip);
      setMessage(`Trip completed${finished.trip_duration_minutes ? ` in ${Math.round(finished.trip_duration_minutes)} mins` : ''}.`);
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Unable to finish this trip.');
    } finally {
      setIsFinishing(false);
    }
  }, [activeTrip, dispatch, tripLogs]);

  const tripDirection = activeTrip?.status ?? selectedDirection;
  const routeLabel = tripDirection === 'returning'
    ? 'Ormoc City Terminal'
    : dispatch?.route_label || 'Route not assigned';
  const isReady = dispatch?.vehicle_activity_status === 'loading';
  const canStart = selectedDirection === 'returning' || (Boolean(dispatch) && isReady);
  const averageDuration = tripDirection === 'returning' ? null : dispatch?.average_travel_duration_minutes;
  const routeDistance = tripDirection === 'returning' ? null : dispatch?.route_distance_km;
  const averageDurationText = averageDuration == null ? '— min' : `${Math.round(averageDuration)} min`;
  const routeDistanceText = routeDistance == null ? '— km' : `${Number(routeDistance).toFixed(1)} km`;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#DCE8F0" />
      <DriverMap
        fullScreen
        routeGeometry={dispatch?.route_geometry}
        followDriver={Boolean(activeTrip)}
        isReturning={tripDirection === 'returning'}
      />

      <SafeAreaView style={styles.locationBanner} edges={['top']} pointerEvents="none">
        <View style={styles.locationHeading}>
          <Ionicons name="location" size={12} color="#009F94" />
          <Text style={styles.locationCaption}>{location ? 'Your location' : 'Waiting for your location'}</Text>
        </View>
        <Text style={styles.locationValue} numberOfLines={1}>
          {location ? locationAddress : 'Turn on location services'}
        </Text>
      </SafeAreaView>

      <Animated.View
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8, transform: [{ translateY: sheetTranslateY }] }]}
        {...sheetPanResponder.panHandlers}
      >
        <View
          accessibilityRole="button"
          accessibilityLabel={sheetCollapsed ? 'Trip details collapsed' : 'Trip details expanded'}
          accessibilityHint="Swipe up to show trip details or swipe down to view more of the map."
          style={sheetCollapsed ? styles.sheetCollapsedHeader : styles.sheetExpandedHeader}
        >
          <View style={styles.grabber} />
          {sheetCollapsed && (
            <View style={styles.collapsedHeaderContent}>
              <Text style={styles.collapsedRouteTitle} numberOfLines={1}>{routeLabel}</Text>
              <View style={styles.collapsedEta}>
                <Text style={styles.collapsedEtaLabel}>ETA</Text>
                <Text style={styles.collapsedEtaValue}>--</Text>
              </View>
            </View>
          )}
        </View>
        <Animated.View style={{ opacity: contentOpacity }} pointerEvents={sheetCollapsed ? 'none' : 'auto'}>
        {activeTrip ? (
          <>
            <Text style={styles.sheetTitle}>Trip in progress, take care!</Text>
            <Text style={styles.sheetSubtitle}>Stay alert on the road.</Text>
            <View style={styles.routeCard}>
              <Text style={styles.routeTitle} numberOfLines={1}>{routeLabel}</Text>
              <View style={styles.directionRow}>
                <Ionicons name="navigate-outline" size={12} color="#315B61" />
                <Text style={styles.directionText}>{tripDirection === 'returning' ? 'Returning to terminal' : 'Outgoing from terminal'}</Text>
              </View>
              <View style={styles.metricsRow}>
                <Metric icon="time-outline" value={formatElapsed(activeTrip.time_departed, now)} label="Elapsed time" />
                <Metric icon="map-outline" value={routeDistanceText} label="Distance from terminal" />
                <Metric icon="time-outline" value={averageDurationText} label="Average trip duration" />
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
            <Text style={styles.sheetSubtitle}>{selectedDirection === 'returning' ? 'Returning trips can start from your current location.' : isReady ? 'Your vehicle is ready at the terminal.' : 'Wait at the terminal until your vehicle is ready.'}</Text>
            <View style={styles.routeCard}>
              <Text style={styles.routeTitle} numberOfLines={1}>{routeLabel}</Text>
              {!activeTrip && (
                <Pressable onPress={() => setDirectionPickerOpen(true)} style={styles.directionBadge} accessibilityRole="button" accessibilityLabel={`Trip direction: ${selectedDirection}. Change direction`}>
                  <Ionicons name={selectedDirection === 'returning' ? 'return-down-back' : 'navigate'} size={13} color="#315B61" />
                  <Text style={styles.directionBadgeText}>{selectedDirection === 'returning' ? 'Returning' : 'Outgoing'}</Text>
                  <Ionicons name="chevron-down" size={13} color="#315B61" />
                </Pressable>
              )}
              <View style={styles.metricsRow}>
                <Metric icon="time-outline" value={averageDurationText} label="Average trip duration" />
                <Metric icon="map-outline" value={routeDistanceText} label="Distance from terminal" />
                <Metric icon="navigate-outline" value={tripDirection === 'returning' ? 'To terminal' : 'From terminal'} label="Direction" />
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
              <Pressable
                onPress={() => selectedDirection === 'outgoing' ? setScanTicketOpen(true) : void handleStart()}
                disabled={isLoading || isStarting || !canStart}
                style={[styles.startButton, (!canStart || isStarting) && styles.disabledButton]}>
                {isLoading || isStarting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.startText}>{selectedDirection === 'outgoing' && !dispatch ? 'Dispatch required' : selectedDirection === 'outgoing' && !isReady ? 'Waiting for terminal' : 'Start Trip'}</Text>}
              </Pressable>
            </View>
          </>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        </Animated.View>
      </Animated.View>
      {/* <View style={styles.grabberBottom}></View> */}

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
      <Modal transparent visible={completedTripSummary !== null} animationType="fade" onRequestClose={() => setCompletedTripSummary(null)}>
        <View style={styles.summaryBackdrop}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCheckCircle}>
              <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryTitle}>Trip completed!</Text>
            <Text style={styles.summarySubtitle}>Here’s a summary of your trip.</Text>
            <View style={styles.summaryRoute}>
              <Text style={styles.summaryRouteLabel}>ROUTE</Text>
              <Text style={styles.summaryRouteValue} numberOfLines={2}>{completedTripSummary?.route_label || 'Route unavailable'}</Text>
              <View style={styles.summaryDirection}>
                <Ionicons
                  name={completedTripSummary?.status === 'returning' ? 'return-down-back' : 'navigate'}
                  size={14}
                  color="#087C73"
                />
                <Text style={styles.summaryDirectionText}>
                  {completedTripSummary?.status === 'returning' ? 'Returning' : 'Outgoing'}
                </Text>
              </View>
            </View>
            <View style={styles.summaryMetrics}>
              <SummaryMetric label="Duration" value={formatTripDuration(completedTripSummary?.trip_duration_minutes ?? null)} icon="time-outline" />
              <SummaryMetric
                label="Average speed"
                value={completedTripSummary?.average_speed_km == null ? '— km/h' : `${Math.round(completedTripSummary.average_speed_km)} km/h`}
                icon="speedometer-outline"
              />
              <SummaryMetric
                label="Distance"
                value={completedTripSummary?.route_distance_km == null ? '— km' : `${Number(completedTripSummary.route_distance_km).toFixed(1)} km`}
                icon="map-outline"
              />
            </View>
            <View style={styles.summaryDetails}>
              <SummaryDetail label="Vehicle" value={completedTripSummary?.vehicle_plate || '—'} />
              <SummaryDetail label="Started" value={formatTripTime(completedTripSummary?.time_departed ?? null)} />
              <SummaryDetail label="Finished" value={formatTripTime(completedTripSummary?.time_arrived ?? null)} />
            </View>
            <Pressable onPress={() => setCompletedTripSummary(null)} style={styles.summaryDoneButton}>
              <Text style={styles.summaryDoneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={scanTicketOpen} animationType="fade" onRequestClose={() => setScanTicketOpen(false)}>
        <Pressable style={styles.scanBackdrop} onPress={() => setScanTicketOpen(false)}>
          <Pressable style={styles.scanPrompt} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.scanTitle}>Scan Your Dispatch Ticket</Text>
            <View style={styles.scanIllustration}>
              <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
              <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
              <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
              <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
              <View style={styles.scanLine} />
              <View style={styles.scanTarget} />
            </View>
            <Text style={styles.scanHint}>Scan Dispatcher’s QR Code to Get Your Dispatch Ticket</Text>
            <Pressable
              onPress={() => setScanActionMessage('Camera scanning will be connected in the next QR screen.')}
              style={styles.scanButton}>
              <Text style={styles.scanButtonText}>Scan Ticket QR Code</Text>
            </Pressable>
            {scanActionMessage ? <Text style={styles.scanActionMessage}>{scanActionMessage}</Text> : null}
            <Pressable onPress={() => { setScanTicketOpen(false); setScanActionMessage(null); }} style={styles.scanCancelButton}>
              <Text style={styles.scanCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={directionPickerOpen && !activeTrip} animationType="fade" onRequestClose={() => setDirectionPickerOpen(false)}>
        <Pressable style={styles.directionBackdrop} onPress={() => setDirectionPickerOpen(false)}>
          <Pressable style={styles.directionPicker} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.directionPickerTitle}>Choose trip direction</Text>
            <Pressable style={styles.directionOption} onPress={() => { setSelectedDirection('outgoing'); setDirectionPickerOpen(false); }}>
              <Ionicons name="navigate" size={19} color="#147A68" />
              <View style={styles.directionOptionCopy}><Text style={styles.directionOptionTitle}>Outgoing</Text><Text style={styles.directionOptionHint}>Terminal to your assigned route. Start at the terminal.</Text></View>
              {selectedDirection === 'outgoing' && <Ionicons name="checkmark-circle" size={20} color="#147A68" />}
            </Pressable>
            <Pressable style={styles.directionOption} onPress={() => { setSelectedDirection('returning'); setDirectionPickerOpen(false); }}>
              <Ionicons name="return-down-back" size={19} color="#147A68" />
              <View style={styles.directionOptionCopy}><Text style={styles.directionOptionTitle}>Returning</Text><Text style={styles.directionOptionHint}>Travel to the terminal from your current location. No dispatch assignment is required.</Text></View>
              {selectedDirection === 'returning' && <Ionicons name="checkmark-circle" size={20} color="#147A68" />}
            </Pressable>
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

function SummaryMetric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryMetric}>
      <Ionicons name={icon} size={17} color="#087C73" />
      <Text style={styles.summaryMetricValue}>{value}</Text>
      <Text style={styles.summaryMetricLabel}>{label}</Text>
    </View>
  );
}

function SummaryDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryDetail}>
      <Text style={styles.summaryDetailLabel}>{label}</Text>
      <Text style={styles.summaryDetailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8E4E2', },
  locationBanner: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 14, paddingBottom: 9, backgroundColor: '#DCE8F0' },
  locationHeading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationCaption: { color: '#4D5B60', fontSize: 9 },
  locationValue: { maxWidth: '100%', marginTop: 1, color: '#27373B', fontSize: 12, fontWeight: '700' },
  sheet: { 
    height: 302, position: 'absolute', right: 0, bottom: 0, left: 0, paddingHorizontal: 10, paddingVertical: 10, experimental_backgroundImage: 'linear-gradient(to bottom, #046057 5%, #FFFFFF 100%)',
    borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: 'column', justifyContent: 'space-around'
   },

  sheetExpandedHeader: { height: 12, alignItems: 'center' },
  routeTitle: {fontFamily: 'Roboto_500Medium', fontSize: 18},
  sheetCollapsedHeader: { height: 58, alignItems: 'center', justifyContent: 'center' },
  grabber: { alignSelf: 'center', width: 75, height: 5, borderRadius: 3, marginBottom: 5, backgroundColor: '#77B8AE' },
  grabberBottom: { alignSelf: 'center', width: 110, height: 5, borderRadius: 3, backgroundColor: '#101010', marginBottom: 8, opacity: .5 },
  collapsedHeaderContent: { width: '100%', flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 3 },
  collapsedRouteTitle: { flex: 1, color: '#FFFFFF', fontFamily: 'Roboto_500Medium', fontSize: 16, fontWeight: '700' },
  collapsedEta: { alignItems: 'flex-end', justifyContent: 'center' },
  collapsedEtaLabel: { color: '#C0DFD9', fontFamily: 'Poppins_400Regular', fontSize: 9 },
  collapsedEtaValue: { color: '#FFFFFF', fontFamily: 'Poppins_500Medium', fontSize: 12, fontWeight: '700' },

  sheetTitle: { color: '#F4FFFC', fontFamily: 'Poppins_500Medium', fontSize: 18, fontWeight: '700' },
  sheetSubtitle: { marginTop: 2, marginBottom: 9, color: '#ffffff', fontFamily: 'Poppins_400Regular', fontSize: 10 },
  routeCard: { height: 125, borderRadius: 5, paddingHorizontal: 13, paddingTop: 8, paddingBottom: 8, backgroundColor: '#F2F7F5', alignItems: 'center', justifyContent: 'center' },
  directionRow: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: 2 },
  directionText: { color: '#315B61', fontSize: 9, fontWeight: '600' },
  directionBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 4, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#DCE9E6' },
  directionBadgeText: { color: '#315B61', fontSize: 11, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginTop: 9 },
  metric: { flex: 1, alignItems: 'center', minWidth: 0 },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#E1E9EC' },
  metricValue: { color: '#2C454A', fontSize: 10, fontFamily: 'Poppins_500Medium' },
  metricLabel: { maxWidth: '100%', marginTop: 3, color: '#63777A', fontFamily: 'Poppins_400Regular_Italic', fontSize: 9, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 9, borderRadius: 5, marginTop: 7, backgroundColor: '#ffffff', padding: 6, boxSizing: 'border-box' },
  backButton: { width: 37, height: 38, alignItems: 'center', justifyContent: 'center' },
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
  directionBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.48)' },
  directionPicker: { width: '100%', borderRadius: 16, padding: 18, backgroundColor: '#F2F7F5' },
  directionPickerTitle: { marginBottom: 10, color: '#153E3B', fontSize: 17, fontWeight: '800' },
  directionOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#C8D8D4' },
  directionOptionCopy: { flex: 1 },
  directionOptionTitle: { color: '#183D3A', fontSize: 14, fontWeight: '700' },
  directionOptionHint: { marginTop: 2, color: '#657A75', fontSize: 11 },
  scanBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.48)' },
  scanPrompt: { alignItems: 'center', borderRadius: 8, paddingHorizontal: 15, paddingTop: 24, paddingBottom: 25, backgroundColor: '#FFFFFF' },
  scanTitle: { color: '#101010', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  scanIllustration: { width: 162, height: 162, alignItems: 'center', justifyContent: 'center', marginTop: 19, marginBottom: 16, backgroundColor: '#C6FAF5' },
  scanCorner: { position: 'absolute', width: 46, height: 46, borderColor: '#00A99A' },
  scanCornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 2 },
  scanCornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 2 },
  scanCornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 2 },
  scanCornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 2 },
  scanLine: { position: 'absolute', left: 11, right: 11, height: 3, backgroundColor: '#00A99A' },
  scanTarget: { width: 34, height: 34, borderWidth: 5, borderColor: '#00A99A' },
  scanHint: { marginBottom: 20, color: '#101010', fontSize: 12, textAlign: 'center' },
  scanButton: { width: '100%', height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#00A99A' },
  scanButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  scanActionMessage: { marginTop: 8, color: '#657A75', fontSize: 11, textAlign: 'center' },
  scanCancelButton: { width: '100%', height: 42, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: '#C5C5C5', borderRadius: 5 },
  scanCancelText: { color: '#111111', fontSize: 15 },
  summaryBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.52)' },
  summaryCard: { width: '100%', alignItems: 'center', borderRadius: 18, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 18, backgroundColor: '#FFFFFF' },
  summaryCheckCircle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#00A99A' },
  summaryTitle: { marginTop: 10, color: '#153E3B', fontSize: 20, fontWeight: '800' },
  summarySubtitle: { marginTop: 3, color: '#607772', fontSize: 12 },
  summaryRoute: { width: '100%', borderRadius: 10, marginTop: 17, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#E8F2F1' },
  summaryRouteLabel: { color: '#66807C', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  summaryRouteValue: { marginTop: 4, color: '#183D3A', fontSize: 14, fontWeight: '700' },
  summaryDirection: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  summaryDirectionText: { color: '#087C73', fontSize: 11, fontWeight: '700' },
  summaryMetrics: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8, marginTop: 14 },
  summaryMetric: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 9, paddingVertical: 10, backgroundColor: '#F2F7F5' },
  summaryMetricValue: { color: '#183D3A', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  summaryMetricLabel: { color: '#657A75', fontSize: 9, textAlign: 'center' },
  summaryDetails: { width: '100%', marginTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D7E2DF' },
  summaryDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E1E9E6' },
  summaryDetailLabel: { color: '#657A75', fontSize: 11 },
  summaryDetailValue: { color: '#183D3A', fontSize: 11, fontWeight: '600' },
  summaryDoneButton: { width: '100%', height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginTop: 15, backgroundColor: '#00A694' },
  summaryDoneText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
2
