import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createDriverReservation,
  getCurrentDriverReservation,
  getMyReservationVehicle,
  getReservationRoutes,
  type DriverReservation,
  type ReservationRoute,
  type ReservationVehicle,
} from '@/api/queueAPI';
import { getMyProfile, type DriverProfile } from '@/api/profileAPI';
import { getTripLogs } from '@/api/tripsAPI';

const TEAL = '#00A99A';
const INK = '#111719';
const CANVAS = '#D5E1EC';

function manilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function displayDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(date);
}

function errorMessage(error: any) {
  return error?.response?.data?.detail
    || error?.response?.data?.error?.message
    || 'Could not send your reservation request. Check your connection and try again.';
}

export default function MakeReservationScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<ReservationVehicle | null>(null);
  const [routes, setRoutes] = useState<ReservationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [currentReservation, setCurrentReservation] = useState<DriverReservation | null>(null);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const [profileData, vehicleData, routeData, reservationData, tripsData] = await Promise.all([
        getMyProfile(),
        getMyReservationVehicle(),
        getReservationRoutes(),
        getCurrentDriverReservation(),
        getTripLogs(),
      ]);
      setProfile(profileData);
      setVehicle(vehicleData);
      setRoutes(routeData);
      setCurrentReservation(reservationData);
      setHasActiveTrip(tripsData.some((trip) => !trip.is_complete));
      setSelectedRouteId((existing) => existing && routeData.some((route) => route.route_id === existing)
        ? existing
        : routeData[0]?.route_id ?? null);
    } catch (loadError: any) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.route_id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );
  const driverName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : '—';

  const submitReservation = useCallback(async () => {
    if (submitting || !selectedRoute || !vehicle || !profile) return;
    setSubmitting(true);
    setError(null);
    try {
      const reservation = await createDriverReservation({
        route_id: selectedRoute.route_id,
        vehicle_id: vehicle.vehicle_id,
        operating_date: manilaDateKey(new Date()),
      });
      setCurrentReservation(reservation);
      setSubmitted(true);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }, [profile, selectedRoute, submitting, vehicle]);

  const cancel = () => router.canGoBack() ? router.back() : router.replace('/tabs');

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerState}><ActivityIndicator size="large" color={TEAL} /><Text style={styles.stateText}>Loading reservation details…</Text></View>
      </SafeAreaView>
    );
  }

  if (currentReservation || hasActiveTrip || !profile || !vehicle) {
    const activeReservation = Boolean(currentReservation);
    const activeTrip = !activeReservation && hasActiveTrip;
    const title = activeReservation ? 'Active reservation found' : activeTrip ? 'Reservation unavailable' : 'Details unavailable';
    const message = activeReservation
      ? 'You already have a pending or active reservation. View it to check its current status.'
      : activeTrip
        ? 'Finish your current trip before requesting a reservation.'
        : error || 'A driver profile and vehicle must be linked to your account before you can reserve.';
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.blockedHeader}>
          <Pressable onPress={cancel} hitSlop={12}><Ionicons name="arrow-back" size={22} color={INK} /></Pressable>
          <Text style={styles.blockedHeaderTitle}>Make a Reservation</Text>
        </View>
        <View style={styles.blockedState}>
          <View style={[styles.blockedIcon, activeTrip && styles.warningIcon]}>
            <Ionicons name={activeReservation ? 'ticket-outline' : activeTrip ? 'navigate-outline' : 'alert-circle-outline'} size={27} color={activeTrip ? '#A56A00' : TEAL} />
          </View>
          <Text style={styles.blockedTitle}>{title}</Text>
          <Text style={styles.blockedCopy}>{message}</Text>
          <Pressable style={styles.cta} onPress={() => activeReservation ? router.replace('/tabs/my-tickets') : activeTrip ? router.replace('/tabs/record-trip') : void load()}>
            <Text style={styles.ctaText}>{activeReservation ? 'View My Tickets' : activeTrip ? 'Return to Live Map' : 'Try Again'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, step === 3 && styles.summaryScreen]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={step === 3 ? CANVAS : '#FFFFFF'} />
      {step === 3 ? (
        <View style={styles.summaryTopBar}>
          <Pressable style={styles.cancelTop} onPress={cancel}>
            <Ionicons name="chevron-back" size={17} color="#20292D" />
            <Text style={styles.cancelTopText}>Cancel</Text>
          </Pressable>
          <ProgressDots active={2} />
          <View style={styles.cancelTopSpacer} />
        </View>
      ) : (
        <View style={styles.formHeading}>
          <Text style={styles.formTitle}>{step === 1 ? 'Personal Details' : 'Service Details'}</Text>
          <ProgressDots active={step} />
        </View>
      )}

      {step === 1 ? (
        <>
          <ScrollView
            contentContainerStyle={styles.formContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(false); }} tintColor={TEAL} />}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Driver Name" value={driverName} />
            <FormField label="Contact Number" value={profile.contact_number} />
          </ScrollView>
          <View style={styles.formActions}>
            <Pressable style={styles.cta} onPress={() => { setError(null); setStep(2); }}>
              <Text style={styles.ctaText}>Next</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={cancel}><Text style={styles.outlineText}>Cancel</Text></Pressable>
          </View>
        </>
      ) : step === 2 ? (
        <>
          <ScrollView
            contentContainerStyle={styles.formContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(false); }} tintColor={TEAL} />}
          >
            <Text style={styles.fieldLabel}>Route / Destination</Text>
            <Pressable style={styles.selectField} onPress={() => setRoutePickerOpen(true)}>
              <Text style={[styles.fieldValue, !selectedRoute && styles.placeholder]}>{selectedRoute?.destination?.name ?? 'Select Trip Destination'}</Text>
              <Ionicons name="chevron-down" size={20} color="#111719" />
            </Pressable>
            <FormField label="Vehicle Plate Number" value={vehicle.plate_number} />
            <FormField label="Vehicle Body Number" value={vehicle.body_number} />
            <Text style={styles.serviceHint}>Your assigned vehicle details are included with this request.</Text>
          </ScrollView>
          <View style={styles.formActions}>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            <Pressable
              style={[styles.cta, !selectedRoute && styles.disabledCta]}
              disabled={!selectedRoute}
              onPress={() => { setError(null); setStep(3); }}
            >
              <Text style={styles.ctaText}>Next</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={() => { setError(null); setStep(1); }}><Text style={styles.outlineText}>Go Back</Text></Pressable>
          </View>
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.summaryContent} showsVerticalScrollIndicator={false}>
            <View style={styles.ticketMark}><Ionicons name="ticket-outline" size={34} color="#00A8F0" /></View>
            <Text style={styles.summaryTitle}>Reservation Summary</Text>
            <View style={styles.summaryCard}>
              <SummaryLine label="Full Name:" value={driverName} />
              <SummaryLine label="Contact No.:" value={profile.contact_number} />
              <SummaryLine label="Vehicle Plate No.:" value={vehicle.plate_number} />
              <SummaryLine label="Vehicle Body No.:" value={vehicle.body_number} />
              <SummaryLine label="Route / Destination:" value={selectedRoute?.destination?.name ?? '—'} />
              <SummaryLine label="Date & Time:" value={displayDateTime(new Date())} />
            </View>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.summaryActions}>
            <Pressable style={[styles.cta, submitting && styles.disabledCta]} onPress={() => void submitReservation()} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Finish</Text>}
            </Pressable>
            <Pressable style={styles.summaryBack} onPress={() => { setError(null); setStep(2); }}><Text style={styles.outlineText}>Go Back</Text></Pressable>
          </View>
        </>
      )}

      <Modal transparent visible={routePickerOpen} animationType="fade" onRequestClose={() => setRoutePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRoutePickerOpen(false)}>
          <Pressable style={styles.routeSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.routeSheetTitle}>Select Trip Destination</Text>
            <ScrollView style={styles.routeList}>
              {routes.map((route) => (
                <Pressable
                  key={route.route_id}
                  style={styles.routeOption}
                  onPress={() => { setSelectedRouteId(route.route_id); setRoutePickerOpen(false); }}
                >
                  <Text style={styles.routeOptionText}>{route.destination?.name ?? `Route ${route.route_id}`}</Text>
                  {selectedRouteId === route.route_id ? <Ionicons name="checkmark-circle" size={20} color={TEAL} /> : null}
                </Pressable>
              ))}
              {routes.length === 0 ? <Text style={styles.noRoutes}>No active routes are available.</Text> : null}
            </ScrollView>
            <Pressable style={styles.routeDone} onPress={() => setRoutePickerOpen(false)}><Text style={styles.routeDoneText}>Close</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={submitted} animationType="fade" onRequestClose={() => setSubmitted(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}><Ionicons name="checkmark" size={27} color="#FFFFFF" /></View>
            <Text style={styles.successTitle}>Reservation Submitted!</Text>
            <Text style={styles.successCopy}>Please wait for the dispatcher’s approval.</Text>
            <Pressable style={styles.cta} onPress={() => { setSubmitted(false); router.replace('/tabs/my-tickets'); }}>
              <Text style={styles.ctaText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProgressDots({ active }: { active: number }) {
  return <View style={styles.progressDots}><View style={[styles.dot, active >= 1 && styles.activeDot]} /><View style={[styles.dot, active >= 2 && styles.activeDot]} /></View>;
}

function FormField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.readonlyField}><Text style={styles.fieldValue}>{value || '—'}</Text></View>
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.summaryLine}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  summaryScreen: { backgroundColor: CANVAS },
  formHeading: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  formTitle: { color: INK, fontSize: 16, fontWeight: '600' },
  progressDots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#D8D8D8' },
  activeDot: { backgroundColor: TEAL },
  formContent: { flexGrow: 1, paddingHorizontal: 15, paddingTop: 8, paddingBottom: 20 },
  formField: { marginBottom: 25 },
  fieldLabel: { marginBottom: 7, color: '#15191B', fontSize: 11, fontWeight: '500' },
  readonlyField: { height: 45, justifyContent: 'center', borderWidth: 1, borderColor: '#858585', borderRadius: 8, paddingHorizontal: 10 },
  fieldValue: { color: '#25292B', fontSize: 14 },
  placeholder: { color: '#74797B' },
  selectField: { height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#858585', borderRadius: 8, marginBottom: 25, paddingHorizontal: 10 },
  formActions: { paddingHorizontal: 15, paddingTop: 8, paddingBottom: 15, gap: 10 },
  cta: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 5, paddingHorizontal: 14, backgroundColor: TEAL },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabledCta: { opacity: 0.55 },
  outlineButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#72D9D0', borderRadius: 5 },
  outlineText: { color: '#111719', fontSize: 14, fontWeight: '500' },
  serviceHint: { marginTop: -13, color: '#6E797B', fontSize: 11 },
  inlineError: { marginBottom: 8, color: '#BA3B3B', fontSize: 12, lineHeight: 17 },
  summaryTopBar: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  cancelTop: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cancelTopText: { color: '#273238', fontSize: 13 },
  cancelTopSpacer: { width: 54 },
  summaryContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 45, paddingBottom: 15 },
  ticketMark: { width: 48, height: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  summaryTitle: { marginBottom: 27, color: '#101619', fontSize: 19, fontWeight: '600' },
  summaryCard: { alignSelf: 'stretch', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  summaryLine: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { flex: 1, color: '#41484B', fontSize: 11 },
  summaryValue: { flex: 1.25, color: '#111719', fontSize: 12, fontWeight: '500', textAlign: 'right' },
  summaryActions: { paddingHorizontal: 15, paddingBottom: 15 },
  summaryBack: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  modalBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.42)' },
  routeSheet: { maxHeight: '75%', borderRadius: 12, padding: 18, backgroundColor: '#FFFFFF' },
  routeSheetTitle: { marginBottom: 10, color: INK, fontSize: 16, fontWeight: '700' },
  routeList: { flexGrow: 0 },
  routeOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE3E4' },
  routeOptionText: { color: '#20292D', fontSize: 14 },
  noRoutes: { paddingVertical: 20, color: '#6A7679', fontSize: 13, textAlign: 'center' },
  routeDone: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderRadius: 6, backgroundColor: '#EAF5F3' },
  routeDoneText: { color: '#087F75', fontSize: 14, fontWeight: '700' },
  successCard: { alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, paddingTop: 25, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  successIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, marginBottom: 19, backgroundColor: TEAL },
  successTitle: { color: '#111719', fontSize: 17, fontWeight: '700' },
  successCopy: { marginTop: 8, marginBottom: 19, color: '#343B3E', fontSize: 14, textAlign: 'center' },
  blockedHeader: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16 },
  blockedHeaderTitle: { color: INK, fontSize: 16, fontWeight: '600' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 11 },
  stateText: { color: '#687477', fontSize: 13 },
  blockedState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  blockedIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: '#E5F5F2' },
  warningIcon: { backgroundColor: '#FFF3DB' },
  blockedTitle: { marginTop: 17, color: INK, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  blockedCopy: { marginTop: 8, color: '#667477', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
