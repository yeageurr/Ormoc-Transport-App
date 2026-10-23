import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { createDriverReservation, getCurrentDriverReservation, type DriverReservation } from '@/api/queueAPI';
import { getTripLogs } from '@/api/tripsAPI';

function manilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function formatDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month, 1)));
}

function errorMessage(error: any) {
  return error?.response?.data?.detail
    || error?.response?.data?.error?.message
    || 'Could not send your reservation request. Check your connection and try again.';
}

export default function MakeReservationScreen() {
  const router = useRouter();
  const todayKey = useMemo(() => manilaDateKey(new Date()), []);
  const [dispatch, setDispatch] = useState<CurrentDispatch | null>(null);
  const [currentReservation, setCurrentReservation] = useState<DriverReservation | null>(null);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = todayKey.split('-').map(Number);
    return { year, month: month - 1 };
  });
  const [requestCreated, setRequestCreated] = useState<DriverReservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [dispatchResult, reservationResult, tripsResult] = await Promise.allSettled([
      getCurrentDispatch(),
      getCurrentDriverReservation(),
      getTripLogs(),
    ]);
    setDispatch(dispatchResult.status === 'fulfilled' ? dispatchResult.value : null);
    setCurrentReservation(reservationResult.status === 'fulfilled' ? reservationResult.value : null);
    setHasActiveTrip(tripsResult.status === 'fulfilled' && tripsResult.value.some((trip) => !trip.is_complete));
    if (dispatchResult.status === 'rejected') {
      setError('Unable to load your assigned route and vehicle. Pull down to retry.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay();
  const calendarCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);
  const currentMonth = Number(todayKey.slice(5, 7)) - 1;
  const currentYear = Number(todayKey.slice(0, 4));
  const previousMonthDisabled = visibleMonth.year === currentYear && visibleMonth.month <= currentMonth;

  const submitReservation = useCallback(async () => {
    if (submitting || loading || currentReservation || hasActiveTrip) return;
    if (!dispatch) {
      setError('You need an assigned route and vehicle before making a reservation.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const reservation = await createDriverReservation({
        route_id: dispatch.route_id,
        vehicle_id: dispatch.vehicle_id,
        operating_date: selectedDate,
      });
      setCurrentReservation(reservation);
      setRequestCreated(reservation);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }, [currentReservation, dispatch, hasActiveTrip, loading, selectedDate, submitting]);

  const stepMonth = (delta: number) => {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + delta, 1));
    setVisibleMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F6F8" />
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#183D3A" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Make a Reservation</Text>
          <Text style={styles.headerSubtitle}>Request your place in the dispatch queue</Text>
        </View>
        <Ionicons name="ticket-outline" size={23} color="#087C73" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingState}><ActivityIndicator size="large" color="#078B7D" /><Text style={styles.loadingText}>Loading your assignment…</Text></View>
        ) : currentReservation ? (
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}><Ionicons name="ticket" size={22} color="#087C73" /></View>
            <Text style={styles.noticeTitle}>You already have an active reservation</Text>
            <Text style={styles.noticeCopy}>A new request is available after this reservation is completed or closed.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/tabs/my-tickets')}>
              <Text style={styles.primaryButtonText}>View My Ticket</Text>
            </Pressable>
          </View>
        ) : hasActiveTrip ? (
          <View style={styles.noticeCard}>
            <View style={[styles.noticeIcon, styles.noticeIconWarning]}><Ionicons name="navigate" size={22} color="#A86900" /></View>
            <Text style={styles.noticeTitle}>Reservation unavailable during a trip</Text>
            <Text style={styles.noticeCopy}>Finish your current trip before requesting a reservation.</Text>
            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/tabs/record-trip')}>
              <Text style={styles.secondaryButtonText}>Return to Live Map</Text>
            </Pressable>
          </View>
        ) : !dispatch ? (
          <View style={styles.noticeCard}>
            <View style={[styles.noticeIcon, styles.noticeIconWarning]}><Ionicons name="alert-circle-outline" size={22} color="#A86900" /></View>
            <Text style={styles.noticeTitle}>No route or vehicle assignment found</Text>
            <Text style={styles.noticeCopy}>Contact the ticketing officer to confirm your route and vehicle assignment before reserving.</Text>
            <Pressable style={styles.secondaryButton} onPress={() => void load()}>
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={19} color="#147A68" />
              <Text style={styles.infoBannerText}>Review your assignment and operating date before sending the request.</Text>
            </View>

            <Text style={styles.sectionLabel}>YOUR ASSIGNMENT</Text>
            <View style={styles.assignmentCard}>
              <AssignmentRow icon="git-branch-outline" label="Route" value={dispatch.route_label} />
              <View style={styles.divider} />
              <AssignmentRow icon="car-outline" label="Vehicle" value={dispatch.vehicle_plate} />
            </View>

            <Text style={[styles.sectionLabel, styles.dateSectionLabel]}>OPERATING DATE</Text>
            <Pressable style={styles.dateField} onPress={() => setCalendarOpen(true)}>
              <View style={styles.dateIcon}><Ionicons name="calendar-outline" size={20} color="#087C73" /></View>
              <View style={styles.dateCopy}>
                <Text style={styles.dateCaption}>Reservation date</Text>
                <Text style={styles.dateValue}>{formatDateKey(selectedDate)}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#607772" />
            </Pressable>
            <Text style={styles.dateHint}>Choose the day you plan to depart. Past dates are unavailable.</Text>

            <View style={styles.requestNote}>
              <Ionicons name="time-outline" size={17} color="#667B77" />
              <Text style={styles.requestNoteText}>Your request time will be recorded automatically when submitted.</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable onPress={() => void submitReservation()} disabled={submitting || !dispatch} style={[styles.primaryButton, (submitting || !dispatch) && styles.buttonDisabled]}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Send Reservation Request</Text>}
            </Pressable>
            <Text style={styles.approvalNote}>Your queue number and ticket are issued after the dispatcher approves this request.</Text>
          </>
        )}
      </ScrollView>

      <Modal transparent visible={calendarOpen} animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.calendarBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calendarCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.calendarHeading}>
              <Pressable accessibilityLabel="Previous month" disabled={previousMonthDisabled} onPress={() => stepMonth(-1)} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={18} color={previousMonthDisabled ? '#C9D1D0' : '#40565D'} />
              </Pressable>
              <Text style={styles.monthTitle}>{monthLabel(visibleMonth.year, visibleMonth.month)}</Text>
              <Pressable accessibilityLabel="Next month" onPress={() => stepMonth(1)} style={styles.monthButton}>
                <Ionicons name="chevron-forward" size={18} color="#40565D" />
              </Pressable>
            </View>
            <View style={styles.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}</View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (day == null) return <View key={`blank-${index}`} style={styles.calendarCell} />;
                const dateKey = `${visibleMonth.year}-${String(visibleMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const disabled = dateKey < todayKey;
                const isSelected = dateKey === selectedDate;
                const isToday = dateKey === todayKey;
                return (
                  <Pressable
                    key={dateKey}
                    disabled={disabled}
                    onPress={() => { setSelectedDate(dateKey); setCalendarOpen(false); }}
                    style={styles.calendarCell}>
                    <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                      <Text style={[styles.dayText, disabled && styles.dayTextDisabled, isSelected && styles.dayTextSelected]}>{day}</Text>
                      {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setCalendarOpen(false)} style={styles.calendarDoneButton}><Text style={styles.calendarDoneText}>Done</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={requestCreated !== null} animationType="fade" onRequestClose={() => setRequestCreated(null)}>
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}><Ionicons name="checkmark" size={26} color="#FFFFFF" /></View>
            <Text style={styles.successTitle}>Request sent</Text>
            <Text style={styles.successCopy}>Your reservation is pending dispatcher approval.</Text>
            <View style={styles.successDetails}>
              <AssignmentRow icon="git-branch-outline" label="Route" value={dispatch?.route_label || '—'} />
              <AssignmentRow icon="calendar-outline" label="Operating date" value={requestCreated ? formatDateKey(requestCreated.operating_date) : '—'} />
              <AssignmentRow icon="ticket-outline" label="Queue number" value={requestCreated?.queue_display || 'Assigned after approval'} />
            </View>
            <Text style={styles.requestedAt}>Requested at {requestCreated?.reserved_at ? new Date(requestCreated.reserved_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'now'}</Text>
            <Pressable style={styles.primaryButton} onPress={() => { setRequestCreated(null); router.replace('/tabs/my-tickets'); }}>
              <Text style={styles.primaryButtonText}>View My Tickets</Text>
            </Pressable>
            <Pressable style={styles.successDone} onPress={() => { setRequestCreated(null); router.replace('/tabs'); }}><Text style={styles.successDoneText}>Done</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AssignmentRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.assignmentRow}>
      <Ionicons name={icon} size={17} color="#087C73" />
      <Text style={styles.assignmentLabel}>{label}</Text>
      <Text style={styles.assignmentValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8E2E5', backgroundColor: '#FFFFFF' },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#E9F2F0' },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#183D3A', fontSize: 17, fontWeight: '800' },
  headerSubtitle: { marginTop: 2, color: '#687A7D', fontSize: 10 },
  content: { paddingHorizontal: 16, paddingTop: 17, paddingBottom: 35 },
  loadingState: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#647873', fontSize: 13 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 11, backgroundColor: '#E1F2EE' },
  infoBannerText: { flex: 1, color: '#315B55', fontSize: 11, lineHeight: 16 },
  sectionLabel: { marginTop: 22, marginBottom: 8, color: '#526A66', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  assignmentCard: { borderRadius: 10, paddingHorizontal: 13, backgroundColor: '#FFFFFF' },
  assignmentRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9 },
  assignmentLabel: { width: 92, color: '#687A7D', fontSize: 11 },
  assignmentValue: { flex: 1, color: '#183D3A', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#DCE5E3' },
  dateSectionLabel: { marginTop: 21 },
  dateField: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  dateIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E2F3EF' },
  dateCopy: { flex: 1 },
  dateCaption: { color: '#687A7D', fontSize: 10 },
  dateValue: { marginTop: 3, color: '#183D3A', fontSize: 13, fontWeight: '700' },
  dateHint: { marginTop: 7, color: '#71817F', fontSize: 10 },
  requestNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 2 },
  requestNoteText: { flex: 1, color: '#687A7D', fontSize: 10, lineHeight: 15 },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginTop: 21, paddingHorizontal: 14, backgroundColor: '#00A694' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  buttonDisabled: { opacity: 0.65 },
  approvalNote: { marginTop: 10, color: '#6C7D7B', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  errorText: { marginTop: 14, color: '#B64040', fontSize: 12, lineHeight: 17 },
  noticeCard: { alignItems: 'center', borderRadius: 12, marginTop: 28, padding: 20, backgroundColor: '#FFFFFF' },
  noticeIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#E2F3EF' },
  noticeIconWarning: { backgroundColor: '#FFF1D9' },
  noticeTitle: { marginTop: 14, color: '#183D3A', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  noticeCopy: { marginTop: 7, color: '#687A7D', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  secondaryButton: { minHeight: 43, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', borderWidth: 1, borderColor: '#00A694', borderRadius: 8, marginTop: 17 },
  secondaryButtonText: { color: '#087C73', fontSize: 13, fontWeight: '700' },
  calendarBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.48)' },
  calendarCard: { width: '100%', borderRadius: 14, padding: 17, backgroundColor: '#FFFFFF' },
  calendarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  monthButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: '#183D3A', fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 5 },
  weekday: { width: `${100 / 7}%`, color: '#70807F', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, height: 43, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  dayCircleSelected: { backgroundColor: '#00A694' },
  dayText: { color: '#233D3B', fontSize: 12, fontWeight: '500' },
  dayTextDisabled: { color: '#C9D1D0' },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  todayDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#00A694' },
  todayDotSelected: { backgroundColor: '#FFFFFF' },
  calendarDoneButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 7, marginTop: 10, backgroundColor: '#E8F2F1' },
  calendarDoneText: { color: '#087C73', fontSize: 13, fontWeight: '700' },
  successBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.5)' },
  successCard: { width: '100%', alignItems: 'center', borderRadius: 16, paddingHorizontal: 17, paddingTop: 22, paddingBottom: 17, backgroundColor: '#FFFFFF' },
  successIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#00A694' },
  successTitle: { marginTop: 10, color: '#183D3A', fontSize: 19, fontWeight: '800' },
  successCopy: { marginTop: 4, color: '#687A7D', fontSize: 11, textAlign: 'center' },
  successDetails: { alignSelf: 'stretch', borderRadius: 9, marginTop: 15, paddingHorizontal: 10, backgroundColor: '#EAF3F1' },
  requestedAt: { marginTop: 10, color: '#6A7A78', fontSize: 10 },
  successDone: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  successDoneText: { color: '#087C73', fontSize: 13, fontWeight: '700' },
});
