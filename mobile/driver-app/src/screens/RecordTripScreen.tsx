import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, PanResponder, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDriverRoutes, getMyDriverVehicle, type DriverRoute, type DriverVehicleStatus } from '@/api/routesAPI';
import { endTrip, getTripLogs, pauseTrip, resumeTrip, startTrip, type DriverTrip, type Trip } from '@/api/tripsAPI';
import { getTripEta } from '@/api/etaAPI';
import { logTripGpsPing } from '@/api/gpsAPI';
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
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [vehicle, setVehicle] = useState<DriverVehicleStatus | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<Trip['status']>('outgoing');
  const [tripLogs, setTripLogs] = useState<DriverTrip[]>([]);
  const [finishOpen, setFinishOpen] = useState(false);
  const [completedTripSummary, setCompletedTripSummary] = useState<DriverTrip | null>(null);
  const [directionPickerOpen, setDirectionPickerOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isUpdatingPause, setIsUpdatingPause] = useState(false);
  const [pausePromptOpen, setPausePromptOpen] = useState(false);
  const [selectedPauseReason, setSelectedPauseReason] = useState<'accident' | 'road_incident' | 'traffic' | 'other' | null>(null);
  const [pauseDetails, setPauseDetails] = useState('');
  const [now, setNow] = useState(Date.now());
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [etaSource, setEtaSource] = useState<string>('unavailable');
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

  const loadTripData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setMessage(null);
    try {
      const [trips, availableRoutes, ownVehicle] = await Promise.all([
        getTripLogs(),
        getDriverRoutes(),
        getMyDriverVehicle(),
      ]);
      setTripLogs(trips);
      setRoutes(availableRoutes);
      setVehicle(ownVehicle);
      const inProgressTrip = trips.find((trip) => !trip.is_complete);
      setActiveTrip(inProgressTrip ?? null);
      setSelectedRouteId((current) => current ?? inProgressTrip?.route_id ?? null);
    } catch {
      setMessage('Unable to refresh your trip. Check your connection and try again.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadTripData(); }, [loadTripData]);
  useEffect(() => {
    if (activeTrip) setDirectionPickerOpen(false);
  }, [activeTrip]);
  useEffect(() => {
    const interval = setInterval(() => { void loadTripData(false); }, 10000);
    return () => clearInterval(interval);
  }, [loadTripData]);
  useEffect(() => {
    if (!activeTrip) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeTrip?.trip_id]);
  useEffect(() => {
    setEtaMinutes(null);
    setEtaSource('unavailable');
    if (!activeTrip) return;
    let mounted = true;
    const refreshEta = () => {
      void getTripEta(activeTrip.trip_id)
        .then((result) => {
          if (mounted) {
            setEtaMinutes(result.eta_minutes);
            setEtaSource(result.source);
          }
        })
        .catch(() => {
          if (mounted) {
            setEtaMinutes(null);
            setEtaSource('unavailable');
          }
        });
    };
    refreshEta();
    const interval = setInterval(refreshEta, 15_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeTrip?.trip_id]);
  useEffect(() => {
    if (!activeTrip) return;
    const tripId = activeTrip.trip_id;
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;
    let lastSentAt = 0;

    const savePosition = (position: Location.LocationObject) => {
      if (!mounted || Date.now() - lastSentAt < 4500) return;
      lastSentAt = Date.now();
      void logTripGpsPing(tripId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speedKph: position.coords.speed == null ? 0 : Math.max(0, position.coords.speed * 3.6),
      }).catch(() => {
        // Location tracking continues if the network is temporarily unavailable.
      });
    };

    const startTripGps = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!mounted || permission.status !== 'granted' || !await Location.hasServicesEnabledAsync()) return;
      try {
        savePosition(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
        if (!mounted) return;
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0 },
          savePosition,
        );
      } catch {
        // The driver can finish the trip even if GPS hardware is unavailable.
      }
    };

    void startTripGps();
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [activeTrip?.trip_id]);
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
    if (isStarting || selectedRouteId == null) return;
    setIsStarting(true);
    setMessage(null);
    try {
      setActiveTrip(await startTrip(selectedRouteId, selectedDirection));
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
  }, [isStarting, selectedDirection, selectedRouteId]);

  const tripDirection = activeTrip?.status ?? selectedDirection;
  const selectedRoute = routes.find((route) => route.route_id === selectedRouteId) ?? null;
  const routeLabel = selectedRoute?.destination?.name
    ? `Ormoc City Terminal ↔ ${selectedRoute.destination.name}`
    : 'Select a route';
  const isReady = vehicle?.activity_status === 'loading';
  const isTripPaused = Boolean(activeTrip?.pause_events?.some((event) => event.resumed_at == null));
  const canStart = selectedRouteId != null && vehicle != null && (selectedDirection === 'returning' || isReady);
  const averageDuration = selectedRoute?.average_travel_duration ?? null;
  const routeDistance = selectedRoute?.distance ?? null;
  const averageDurationText = averageDuration == null ? '— min' : `${Math.round(averageDuration)} min`;
  const routeDistanceText = routeDistance == null ? '— km' : `${Number(routeDistance).toFixed(1)} km`;

  const terminalReadinessMessage = location?.geofence?.error
    ? `Terminal check failed: ${location.geofence.error}`
    : location?.geofence?.currently_inside === false
      ? 'GPS reports you outside the terminal geofence. Check the device location and terminal boundary.'
      : location?.geofence?.currently_inside && (location.geofence.remaining_seconds ?? 0) > 0
        ? `Inside the terminal geofence. Keep the vehicle here for ${Math.ceil(location.geofence.remaining_seconds ?? 0)} more seconds.`
        : location?.geofence?.currently_inside
          ? 'Inside the terminal geofence. Waiting for the vehicle readiness status.'
          : 'Waiting for a GPS check from the terminal geofence.';

  const handleTogglePause = useCallback(async () => {
    if (!activeTrip || isUpdatingPause) return;
    if (!isTripPaused) {
      setSelectedPauseReason(null);
      setPauseDetails('');
      setPausePromptOpen(true);
      return;
    }
    setIsUpdatingPause(true);
    setMessage(null);
    try {
      const event = await resumeTrip(String(activeTrip.trip_id));
      setActiveTrip((current) => current ? ({
        ...current,
        pause_events: (current.pause_events ?? []).map((item) => item.pause_event_id === event.pause_event_id ? event : item),
      }) : current);
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Unable to update the trip pause. Try again.');
    } finally {
      setIsUpdatingPause(false);
    }
  }, [activeTrip, isTripPaused, isUpdatingPause]);

  const submitPause = useCallback(async (broadcast: boolean) => {
    if (!activeTrip || isUpdatingPause) return;
    setIsUpdatingPause(true);
    setMessage(null);
    try {
      const event = await pauseTrip(String(activeTrip.trip_id), broadcast ? {
        broadcast_to_commuters: true,
        delay_reason: selectedPauseReason,
        delay_details: selectedPauseReason === 'other' ? pauseDetails : null,
      } : { broadcast_to_commuters: false });
      setActiveTrip((current) => current ? ({ ...current, pause_events: [...(current.pause_events ?? []), event] }) : current);
      setPausePromptOpen(false);
      setSelectedPauseReason(null);
      setPauseDetails('');
      setMessage(broadcast ? 'Trip paused. Delay notice sent to commuters on this route.' : 'Trip paused. GPS location logging remains active.');
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Unable to pause the trip. Try again.');
    } finally {
      setIsUpdatingPause(false);
    }
  }, [activeTrip, isUpdatingPause, pauseDetails, selectedPauseReason]);

  const handleFinish = useCallback(async () => {
    if (!activeTrip) return;
    setIsFinishing(true);
    try {
      const finished = await endTrip(String(activeTrip.trip_id));
      const existingTrip = tripLogs.find((trip) => trip.trip_id === finished.trip_id);
      const completedTrip: DriverTrip = {
        ...finished,
        vehicle_plate: existingTrip?.vehicle_plate ?? vehicle?.plate_number ?? null,
        route_id: finished.route_id ?? selectedRouteId,
        route_label: existingTrip?.route_label ?? routeLabel,
        route_distance_km: existingTrip?.route_distance_km ?? routeDistance,
      };
      // Suggest the opposite direction for the next leg of a round trip.
      // The driver can still change it with the direction selector.
      setSelectedDirection(finished.status === 'outgoing' ? 'returning' : 'outgoing');
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
  }, [activeTrip, routeDistance, routeLabel, selectedRouteId, tripLogs, vehicle]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#DCE8F0" />
      <DriverMap
        fullScreen
        routeGeometry={selectedRoute?.route_geometry}
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
                <Text style={styles.collapsedEtaValue}>
                  {etaMinutes == null ? '--' : `~${Math.max(0, Math.round(etaMinutes))} min`}
                </Text>
              </View>
            </View>
          )}
        </View>
        <Animated.View style={{ opacity: contentOpacity }} pointerEvents={sheetCollapsed ? 'none' : 'auto'}>
        {activeTrip ? (
          <>
            <Text style={styles.sheetTitle}>Trip in progress, take care!</Text>
            <Text style={styles.sheetSubtitle}>{isTripPaused ? 'Trip paused. GPS location logging remains active.' : 'Stay alert on the road.'}</Text>
            <Text style={styles.etaNote}>
              {etaSource === 'trained_model'
                ? 'ETA prediction based on collected trip data.'
                : etaSource === 'distance_speed_fallback'
                  ? 'Basic distance-and-speed estimate while trip data is collected.'
                  : 'ETA needs a recent GPS fix and route geometry.'}
            </Text>
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
              <Pressable accessibilityRole="button" accessibilityLabel={isTripPaused ? 'Resume trip; GPS logging is active' : 'Pause trip; GPS logging will continue'} disabled={isUpdatingPause} onPress={() => void handleTogglePause()} style={[styles.pauseButton, isUpdatingPause && styles.disabledButton]}>
                {isUpdatingPause ? <ActivityIndicator size="small" color="#087C73" /> : <Text style={styles.pauseText}>{isTripPaused ? 'Resume' : 'Pause'}</Text>}
              </Pressable>
              <Pressable onPress={() => setFinishOpen(true)} style={styles.endButton}>
                <Text style={styles.endText}>End Trip</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Heads up!</Text>
            <Text style={styles.sheetSubtitle}>{selectedDirection === 'returning' ? 'Returning trips can start from your current location.' : isReady ? 'Your vehicle is ready at the terminal.' : terminalReadinessMessage}</Text>
            <View style={styles.routeCard}>
              <Pressable disabled={Boolean(activeTrip)} onPress={() => setRoutePickerOpen(true)} accessibilityRole="button" style={styles.routeSelectButton}>
                <Text style={styles.routeTitle} numberOfLines={1}>{routeLabel}</Text>
                {!activeTrip && <Ionicons name="chevron-down" size={16} color="#315B61" />}
              </Pressable>
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
                onPress={() => void handleStart()}
                disabled={isLoading || isStarting || !canStart}
                style={[styles.startButton, (!canStart || isStarting) && styles.disabledButton]}>
                {isLoading || isStarting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.startText}>{selectedRouteId == null ? 'Select a route' : !vehicle ? 'Vehicle unavailable' : selectedDirection === 'outgoing' && !isReady ? 'Waiting for terminal' : 'Start Trip'}</Text>}
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
      <Modal transparent visible={pausePromptOpen} animationType="fade" onRequestClose={() => setPausePromptOpen(false)}>
        <View style={styles.pauseBackdrop}>
          <View style={styles.pausePrompt}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close pause prompt" onPress={() => setPausePromptOpen(false)} style={styles.pauseCloseButton}>
              <Ionicons name="close" size={22} color="#526A68" />
            </Pressable>
            <Ionicons name="megaphone-outline" size={30} color="#087C73" />
            <Text style={styles.pausePromptTitle}>Something happened?</Text>
            <Text style={styles.pausePromptSubtitle}>Share a delay notice with commuters on this route.</Text>
            {([
              ['accident', 'Caught an accident', 'car-outline'],
              ['road_incident', 'Road incident', 'warning-outline'],
              ['traffic', 'Traffic', 'navigate-outline'],
              ['other', 'Others', 'ellipsis-horizontal-circle-outline'],
            ] as const).map(([reason, label, icon]) => (
              <Pressable key={reason} accessibilityRole="radio" accessibilityState={{ checked: selectedPauseReason === reason }} onPress={() => setSelectedPauseReason(reason)} style={[styles.pauseReasonOption, selectedPauseReason === reason && styles.pauseReasonSelected]}>
                <Ionicons name={icon} size={18} color={selectedPauseReason === reason ? '#087C73' : '#657B77'} />
                <Text style={[styles.pauseReasonText, selectedPauseReason === reason && styles.pauseReasonTextSelected]}>{label}</Text>
                {selectedPauseReason === reason && <Ionicons name="checkmark-circle" size={18} color="#087C73" />}
              </Pressable>
            ))}
            {selectedPauseReason === 'other' && (
              <TextInput
                value={pauseDetails}
                onChangeText={setPauseDetails}
                placeholder="Tell commuters what happened"
                placeholderTextColor="#8A9A97"
                multiline
                maxLength={500}
                textAlignVertical="top"
                style={styles.pauseDetailsInput}
              />
            )}
            <Pressable disabled={isUpdatingPause || selectedPauseReason == null || (selectedPauseReason === 'other' && !pauseDetails.trim())} onPress={() => void submitPause(true)} style={[styles.pauseBroadcastButton, (isUpdatingPause || selectedPauseReason == null || (selectedPauseReason === 'other' && !pauseDetails.trim())) && styles.disabledButton]}>
              {isUpdatingPause ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="megaphone" size={17} color="#FFFFFF" /><Text style={styles.pauseBroadcastText}>Pause & Broadcast</Text></>}
            </Pressable>
            <Pressable disabled={isUpdatingPause} onPress={() => void submitPause(false)} style={styles.pauseNoIssueButton}>
              <Text style={styles.pauseNoIssueText}>Nothing's wrong</Text>
            </Pressable>
            <Text style={styles.pauseGpsDisclaimer}>GPS logging continues while your trip is paused.</Text>
          </View>
        </View>
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
                value={completedTripSummary?.distance_traveled_km == null ? '0.0 km' : `${Number(completedTripSummary.distance_traveled_km).toFixed(1)} km`}
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
      <Modal transparent visible={routePickerOpen && !activeTrip} animationType="fade" onRequestClose={() => setRoutePickerOpen(false)}>
        <Pressable style={styles.directionBackdrop} onPress={() => setRoutePickerOpen(false)}>
          <Pressable style={styles.directionPicker} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.directionPickerTitle}>Choose your route</Text>
            {routes.map((route) => (
              <Pressable key={route.route_id} style={styles.directionOption} onPress={() => { setSelectedRouteId(route.route_id); setRoutePickerOpen(false); }}>
                <View style={styles.directionOptionCopy}>
                  <Text style={styles.directionOptionTitle}>{route.destination?.name ?? `Route ${route.route_id}`}</Text>
                  <Text style={styles.directionOptionHint}>{Number(route.distance).toFixed(1)} km · {route.average_travel_duration == null ? 'duration unavailable' : `${Math.round(route.average_travel_duration)} min average`}</Text>
                </View>
                {selectedRouteId === route.route_id && <Ionicons name="checkmark-circle" size={20} color="#147A68" />}
              </Pressable>
            ))}
            {!routes.length && <Text style={styles.directionOptionHint}>No active routes are available.</Text>}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={directionPickerOpen && !activeTrip} animationType="fade" onRequestClose={() => setDirectionPickerOpen(false)}>
        <Pressable style={styles.directionBackdrop} onPress={() => setDirectionPickerOpen(false)}>
          <Pressable style={styles.directionPicker} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.directionPickerTitle}>Choose trip direction</Text>
            <Pressable style={styles.directionOption} onPress={() => { setSelectedDirection('outgoing'); setDirectionPickerOpen(false); }}>
              <Ionicons name="navigate" size={19} color="#147A68" />
              <View style={styles.directionOptionCopy}><Text style={styles.directionOptionTitle}>Outgoing</Text><Text style={styles.directionOptionHint}>Travel from the terminal along your selected route.</Text></View>
              {selectedDirection === 'outgoing' && <Ionicons name="checkmark-circle" size={20} color="#147A68" />}
            </Pressable>
            <Pressable style={styles.directionOption} onPress={() => { setSelectedDirection('returning'); setDirectionPickerOpen(false); }}>
              <Ionicons name="return-down-back" size={19} color="#147A68" />
              <View style={styles.directionOptionCopy}><Text style={styles.directionOptionTitle}>Returning</Text><Text style={styles.directionOptionHint}>Travel back to the terminal along your selected route.</Text></View>
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
  etaNote: { marginTop: -5, marginBottom: 7, color: '#D1E4E1', fontFamily: 'Poppins_400Regular', fontSize: 8, fontStyle: 'italic', textAlign: 'center' },
  routeSelectButton: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
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
  pauseBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  pausePrompt: { width: '100%', maxWidth: 440, borderRadius: 16, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 17, backgroundColor: '#F6FAF8' },
  pauseCloseButton: { position: 'absolute', top: 11, right: 11, zIndex: 1, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#E8F0ED' },
  pausePromptTitle: { marginTop: 8, color: '#153E3B', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  pausePromptSubtitle: { marginTop: 5, marginBottom: 14, color: '#607772', fontSize: 12, textAlign: 'center' },
  pauseReasonOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7, borderWidth: 1, borderColor: '#D4E0DC', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  pauseReasonSelected: { borderColor: '#00A694', backgroundColor: '#EAF7F3' },
  pauseReasonText: { flex: 1, color: '#3D5652', fontSize: 13, fontWeight: '600' },
  pauseReasonTextSelected: { color: '#087C73' },
  pauseDetailsInput: { minHeight: 78, marginTop: 9, borderWidth: 1, borderColor: '#BFCFCB', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, color: '#183D3A', fontSize: 13, backgroundColor: '#FFFFFF' },
  pauseBroadcastButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15, borderRadius: 8, backgroundColor: '#00A694' },
  pauseBroadcastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pauseNoIssueButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  pauseNoIssueText: { color: '#087C73', fontSize: 13, fontWeight: '700' },
  pauseGpsDisclaimer: { marginTop: 1, color: '#758782', fontSize: 10, textAlign: 'center' },
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
  cameraScreen: { flex: 1, justifyContent: 'space-between', backgroundColor: '#000000' },
  cameraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.42)' },
  cameraCloseButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  cameraTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  cameraTargetArea: { alignItems: 'center', justifyContent: 'center' },
  cameraFrame: { width: 260, height: 260, borderWidth: 3, borderColor: '#00D0B9', borderRadius: 22 },
  cameraFooter: { minHeight: 92, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 18, backgroundColor: 'rgba(0,0,0,0.55)' },
  cameraFooterText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
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
