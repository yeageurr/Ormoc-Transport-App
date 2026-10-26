import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCommuterRoutes, getLiveCommuterVehicles, type CommuterRoute, type CommuterVehicle } from '@/api/publicAPI';
import CommuterLiveMap from '@/components/CommuterLiveMap';

const SKY = '#A9E4FF';

export default function LiveMapScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [routes, setRoutes] = useState<CommuterRoute[]>([]);
  const [vehicles, setVehicles] = useState<CommuterVehicle[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });

    return () => backSubscription.remove();
  }, []);

  const loadRoutes = useCallback(async () => {
    try {
      setRoutes(await getCommuterRoutes());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load routes.');
    }
  }, []);

  const loadVehicles = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setVehicles(await getLiveCommuterVehicles());
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load live vehicles.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoutes();
    void loadVehicles(true);
    const refresh = setInterval(() => void loadVehicles(), 10_000);
    return () => clearInterval(refresh);
  }, [loadRoutes, loadVehicles]);

  const selectedRoute = routes.find((route) => route.route_id === selectedRouteId) ?? null;
  const selectedVehicle = vehicles.find((vehicle) => vehicle.vehicle_id === selectedVehicleId) ?? null;
  const routeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.route_id === selectedRouteId),
    [vehicles, selectedRouteId]
  );
  const closeInfoSheet = useCallback(() => {
    setSelectedVehicleId(null);
    setSelectedRouteId(null);
  }, []);
  const sheetHandlePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 3 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      sheetTranslateY.setValue(Math.max(0, gesture.dy));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 90 || gesture.vy > 1.1) {
        Animated.timing(sheetTranslateY, {
          toValue: screenHeight,
          duration: 180,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            closeInfoSheet();
            sheetTranslateY.setValue(0);
          }
        });
        return;
      }
      if (Math.abs(gesture.dy) < 8) {
        closeInfoSheet();
        return;
      }
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 4,
      }).start();
    },
  }), [closeInfoSheet, screenHeight, sheetTranslateY]);

  const chooseRoute = (route: CommuterRoute) => {
    setSelectedRouteId(route.route_id);
    setSelectedVehicleId(null);
    setRoutePickerOpen(false);
  };

  const chooseVehicle = (vehicleId: number) => {
    const vehicle = vehicles.find((item) => item.vehicle_id === vehicleId);
    if (!vehicle) return;
    setSelectedVehicleId(vehicleId);
    if (vehicle.route_id != null) setSelectedRouteId(vehicle.route_id);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <CommuterLiveMap
        routes={routes}
        vehicles={vehicles}
        selectedRouteId={selectedRouteId}
        selectedVehicleId={selectedVehicleId}
        onSelectRoute={(routeId) => { setSelectedRouteId(routeId); setSelectedVehicleId(null); }}
        onSelectVehicle={chooseVehicle}
      />

      <View style={[styles.locationHeader, { paddingTop: insets.top + 7 }]}>
        <Text style={styles.locationCaption}><Text style={styles.locationPin}>⌖</Text>  Your location</Text>
        <Text style={styles.locationName}>Ormoc City Public Terminal</Text>
      </View>

      <Pressable style={[styles.routesButton, { top: insets.top + 64 }]} onPress={() => setRoutePickerOpen(true)} accessibilityRole="button">
        <Text style={styles.routesButtonIcon}>⌕</Text><Text style={styles.routesButtonText}>{selectedRoute?.destination_name ?? 'Routes'}</Text>
      </Pressable>

      {error ? <View style={[styles.errorBanner, { top: insets.top + 112 }]}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => { void loadRoutes(); void loadVehicles(true); }}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
      {loading && <View style={styles.loadingPill}><ActivityIndicator color="#008DC8" size="small" /><Text style={styles.loadingText}>Loading live map…</Text></View>}

      {(selectedRoute || selectedVehicle) && (
        <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: sheetTranslateY }] }]}>
          <LinearGradient colors={['#A8E7FF', '#02A8EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          <View
            {...sheetHandlePanResponder.panHandlers}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Swipe down or tap to close route details"
            style={styles.sheetHandle}
          >
            <View pointerEvents="none" style={styles.handle} />
          </View>
          {selectedVehicle ? (
            <VehicleCard vehicle={selectedVehicle} route={routes.find((route) => route.route_id === selectedVehicle.route_id) ?? selectedRoute} onClose={() => setSelectedVehicleId(null)} />
          ) : selectedRoute ? (
            <RouteCard route={selectedRoute} vehicleCount={routeVehicles.length} onPress={() => setRoutePickerOpen(true)} />
          ) : null}
          </LinearGradient>
        </Animated.View>
      )}

      <Modal visible={routePickerOpen} transparent animationType="slide" onRequestClose={() => setRoutePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRoutePickerOpen(false)} accessibilityLabel="Close route selector" />
          <View style={[styles.routeSheet, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
            <View style={styles.routeSheetHandle} />
            <View style={styles.routeSheetHeading}><View><Text style={styles.routeSheetTitle}>Choose your route</Text><Text style={styles.routeSheetSubtitle}>Select a route to see vehicles on the map.</Text></View><Pressable onPress={() => setRoutePickerOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.routeList}>
              {routes.map((route) => {
                const count = vehicles.filter((vehicle) => vehicle.route_id === route.route_id).length;
                const active = route.route_id === selectedRouteId;
                return <Pressable key={route.route_id} style={[styles.routeOption, active && styles.routeOptionActive]} onPress={() => chooseRoute(route)}>
                  <View style={styles.routeOptionCopy}><Text style={styles.routeOptionTitle}>{route.destination_name}</Text><Text style={styles.routeOptionCaption}>{route.origin_name} · {route.distance_km.toFixed(1)} km</Text></View>
                  <Text style={styles.routeOptionCount}>{count} on route</Text>
                </Pressable>;
              })}
              {!routes.length && <Text style={styles.noRoutes}>{loading ? 'Loading routes…' : 'No active routes are available.'}</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RouteCard({ route, vehicleCount, onPress }: { route: CommuterRoute; vehicleCount: number; onPress: () => void }) {
  const duration = route.average_travel_duration_minutes == null ? '—' : `${Math.round(route.average_travel_duration_minutes)} min`;
  return <Pressable onPress={onPress} style={styles.routeCard}>
    <View style={styles.routeEndpoints}><Text numberOfLines={1} style={styles.endpointText}>{route.origin_name}</Text><Text style={styles.swapIcon}>⇄</Text><Text numberOfLines={1} style={styles.endpointText}>{route.destination_name}</Text></View>
    <View style={styles.routeMetrics}><View style={styles.metric}><Text style={styles.metricValue}>{duration}</Text><Text style={styles.metricLabel}>Avg. trip duration</Text></View><View style={styles.metricDivider} /><View style={styles.metric}><Text style={styles.metricValue}>{vehicleCount}</Text><Text style={styles.metricLabel}>Vehicles on route</Text></View></View>
  </Pressable>;
}

function VehicleCard({ vehicle, route, onClose }: { vehicle: CommuterVehicle; route: CommuterRoute | null; onClose: () => void }) {
  const heading = vehicle.route_label || route?.destination_name || 'Ormoc City Public Terminal';
  return <View style={styles.vehicleCard}>
    <View style={styles.vehicleCardHeader}><Text style={styles.vehiclePlate}>▣  {vehicle.plate_number.toUpperCase()}</Text><Text style={styles.vehicleBodyNumber}>▰  {vehicle.body_number}</Text><Pressable onPress={onClose} style={styles.vehicleClose}><Text style={styles.vehicleCloseText}>×</Text></Pressable></View>
    <Text style={styles.headingCaption}>Heading to</Text>
    <Text numberOfLines={1} style={styles.headingValue}>{heading}</Text>
    <View style={styles.vehicleMetrics}><View style={styles.vehicleMetric}><Text style={styles.vehicleMetricValue}>--</Text><Text style={styles.vehicleMetricLabel}>ETA</Text></View><View style={styles.vehicleMetricDivider} /><View style={styles.vehicleMetric}><View style={[styles.colorSwatch, { backgroundColor: vehicle.body_color }]} /><Text style={styles.vehicleMetricLabel}>Body color</Text></View></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EAE7E4' },
  locationHeader: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 15, paddingBottom: 7, backgroundColor: SKY },
  locationCaption: { color: '#17343D', fontFamily: 'Poppins_400Regular', fontSize: 11 },
  locationPin: { color: '#00A9C7', fontSize: 14 },
  locationName: { color: '#111111', fontFamily: 'Poppins_500Medium', fontSize: 13 },
  routesButton: { position: 'absolute', right: 12, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: 190, paddingHorizontal: 13, borderRadius: 22, backgroundColor: '#FFFFFF', elevation: 4 },
  routesButtonIcon: { color: '#087D99', fontSize: 22, lineHeight: 24 },
  routesButtonText: { color: '#18333E', fontFamily: 'Poppins_500Medium', fontSize: 11 },
  errorBanner: { position: 'absolute', left: 12, right: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#FFF3E8', elevation: 3 },
  errorText: { flex: 1, color: '#8E4E00', fontSize: 11 },
  retryText: { marginLeft: 10, color: '#087BA2', fontSize: 11, fontWeight: '600' },
  loadingPill: { position: 'absolute', top: 118, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFFFFF', elevation: 2 },
  loadingText: { color: '#34515D', fontSize: 10 },
  sheetWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomSheet: { paddingTop: 8, paddingHorizontal: 14, borderTopLeftRadius: 17, borderTopRightRadius: 17 },
  sheetHandle: { alignItems: 'center', justifyContent: 'center', height: 40, marginTop: -8, marginBottom: -2 },
  handle: { width: 68, height: 5, borderRadius: 4, backgroundColor: '#1B1B1B' },
  routeCard: { minHeight: 86, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 6, backgroundColor: '#EAE7E4' },
  routeEndpoints: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  endpointText: { flex: 1, color: '#111111', fontFamily: 'Poppins_500Medium', fontSize: 12, textAlign: 'center' },
  swapIcon: { color: '#385763', fontSize: 16 },
  routeMetrics: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  metric: { width: '45%', alignItems: 'center' },
  metricValue: { color: '#121212', fontFamily: 'Poppins_500Medium', fontSize: 12 },
  metricLabel: { color: '#4A4A4A', fontFamily: 'Poppins_400Regular', fontSize: 7 },
  metricDivider: { width: 1, height: 26, backgroundColor: '#BEBBB8' },
  vehicleCard: { minHeight: 142, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, borderRadius: 6, backgroundColor: '#EAE7E4' },
  vehicleCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  vehiclePlate: { flex: 1, color: '#172E37', fontFamily: 'Poppins_500Medium', fontSize: 10 },
  vehicleBodyNumber: { color: '#172E37', fontFamily: 'Poppins_500Medium', fontSize: 10 },
  vehicleClose: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  vehicleCloseText: { color: '#62757C', fontSize: 22, lineHeight: 24 },
  headingCaption: { marginTop: 3, color: '#4A4A4A', fontFamily: 'Poppins_400Regular', fontSize: 8 },
  headingValue: { color: '#101820', fontFamily: 'Poppins_500Medium', fontSize: 20, textAlign: 'center' },
  vehicleMetrics: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  vehicleMetric: { width: '42%', alignItems: 'center', justifyContent: 'center' },
  vehicleMetricValue: { color: '#111111', fontFamily: 'Poppins_500Medium', fontSize: 13 },
  vehicleMetricLabel: { color: '#424242', fontFamily: 'Poppins_400Regular', fontSize: 7 },
  vehicleMetricDivider: { width: 1, height: 25, backgroundColor: '#BEBBB8' },
  colorSwatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#888888', marginBottom: 2 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 33, 45, 0.34)' },
  routeSheet: { maxHeight: '76%', paddingTop: 8, paddingHorizontal: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#F8FCFE' },
  routeSheetHandle: { alignSelf: 'center', width: 52, height: 5, marginBottom: 15, borderRadius: 4, backgroundColor: '#9FB2B9' },
  routeSheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  routeSheetTitle: { color: '#183B4C', fontFamily: 'Poppins_600SemiBold', fontSize: 17 },
  routeSheetSubtitle: { marginTop: 2, color: '#607681', fontFamily: 'Poppins_400Regular', fontSize: 10 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#E7F1F5' },
  closeText: { color: '#536B75', fontSize: 23, lineHeight: 26 },
  routeList: { paddingBottom: 10, gap: 8 },
  routeOption: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: '#D2E1E7', borderRadius: 12, backgroundColor: '#FFFFFF' },
  routeOptionActive: { borderColor: '#09A5D2', backgroundColor: '#E9F8FC' },
  routeOptionCopy: { flex: 1 },
  routeOptionTitle: { color: '#193C4B', fontFamily: 'Poppins_500Medium', fontSize: 13 },
  routeOptionCaption: { color: '#657A83', fontFamily: 'Poppins_400Regular', fontSize: 9 },
  routeOptionCount: { color: '#1A758F', fontFamily: 'Poppins_500Medium', fontSize: 9 },
  noRoutes: { padding: 20, color: '#667D86', fontSize: 12, textAlign: 'center' },
});
