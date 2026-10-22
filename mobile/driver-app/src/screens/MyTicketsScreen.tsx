import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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

import { type DriverReservationHistory, getDriverReservationHistory } from '@/api/queueAPI';
import { NotificationBell } from '@/components/NotificationCenter';

function manilaDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function manilaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month) - 1, day: Number(values.day) };
}

function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function getTicketStatus(reservation: DriverReservationHistory): 'Pending' | 'Approved' | 'Closed' {
  if (reservation.approval_status === 'pending') return 'Pending';
  if (
    reservation.approval_status === 'cancelled'
    || reservation.approval_status === 'expired'
    || reservation.queue_status === 'departed'
    || reservation.ticket_is_valid === false
  ) return 'Closed';
  return 'Approved';
}

function getClosureLabel(reservation: DriverReservationHistory) {
  if (reservation.ticket_used_at || reservation.departed_at) return 'Used for departure';
  if (reservation.ticket_cancelled_at || reservation.cancelled_at) return 'Cancelled by dispatcher';
  if (reservation.ticket_expired_at || reservation.expired_at || reservation.approval_status === 'expired') return 'Expired';
  return null;
}

export default function MyTicketsScreen() {
  const [reservations, setReservations] = useState<DriverReservationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<DriverReservationHistory | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>(() => {
    const { year, month } = manilaDateParts(new Date());
    return { year, month };
  });

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLoadError(false);
    try {
      setReservations(await getDriverReservationHistory());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const todayKey = manilaDateKey(new Date());
  const yesterdayKey = manilaDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const groups = useMemo(() => {
    const filtered = reservations.filter((reservation) => (
      selectedDate === null || manilaDateKey(reservation.reserved_at) === selectedDate
    ));
    const grouped = new Map<string, DriverReservationHistory[]>();
    for (const reservation of filtered) {
      const key = manilaDateKey(reservation.reserved_at);
      grouped.set(key, [...(grouped.get(key) ?? []), reservation]);
    }
    return [...grouped.entries()].map(([key, items]) => ({
      key,
      title: key === todayKey
        ? 'Today'
        : key === yesterdayKey
          ? `Yesterday · ${formatDateKey(key)}`
          : formatDateKey(key),
      items,
    }));
  }, [reservations, selectedDate, todayKey, yesterdayKey]);

  const currentMonth = manilaDateParts(new Date());
  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);
  const filterLabel = selectedDate ? formatDateKey(selectedDate) : 'Filter by date';
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.header} />
      <View style={styles.header}>
        <Text style={styles.title}>My Tickets</Text>
        <NotificationBell />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.recordCount}>{loading ? 'Loading tickets…' : `${reservations.length} ticket records`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filter tickets: ${filterLabel}`}
          onPress={() => {
            setVisibleMonth(selectedDate ? manilaDateParts(new Date(`${selectedDate}T12:00:00+08:00`)) : currentMonth);
            setCalendarOpen(true);
          }}
          style={styles.filterButton}
        >
          <Ionicons name="calendar-outline" size={13} color="#52636A" />
          <Text numberOfLines={1} style={styles.filterLabel}>{filterLabel}</Text>
          <Ionicons name="chevron-down" size={12} color="#52636A" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {loading ? (
          <StateView icon={<ActivityIndicator color={COLORS.primary} />} message="Loading your tickets…" />
        ) : loadError ? (
          <View style={styles.state}>
            <Ionicons name="cloud-offline-outline" size={30} color="#688089" />
            <Text style={styles.stateTitle}>Couldn’t load tickets</Text>
            <Text style={styles.stateText}>Check your connection and try again.</Text>
            <Pressable onPress={() => void load()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : groups.length === 0 ? (
          <StateView icon={<Ionicons name="ticket-outline" size={32} color="#688089" />} message={selectedDate ? `No tickets on ${formatDateKey(selectedDate)}.` : 'Your reservations and tickets will appear here.'} />
        ) : groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map((reservation) => (
              <TicketRow key={reservation.id} reservation={reservation} onPress={() => setSelectedTicket(reservation)} />
            ))}
          </View>
        ))}
      </ScrollView>

      <Modal transparent visible={Boolean(selectedTicket)} animationType="fade" onRequestClose={() => setSelectedTicket(null)}>
        <Pressable style={styles.detailBackdrop} onPress={() => setSelectedTicket(null)}>
          {selectedTicket ? (
            <Pressable style={styles.receipt} onPress={(event) => event.stopPropagation()}>
              <View style={styles.receiptTop}>
                <TicketIcon large />
                <View style={styles.receiptHeading}>
                  <Text style={styles.receiptBrand}>Ormoc Transport App</Text>
                  <Text style={styles.receiptSubtitle}>Dispatch Ticket Summary</Text>
                </View>
                <StatusBadge reservation={selectedTicket} />
              </View>
              <View style={styles.receiptCutoutRow}>
                <View style={styles.receiptDash} />
              </View>
              <DetailLine label="Driver Name" value={selectedTicket.driver_name} />
              <DetailLine label="Queue Number" value={selectedTicket.queue_display || 'Pending approval'} />
              <DetailLine label="Route / Destination" value={selectedTicket.route_label} />
              <DetailLine label="Operating Date" value={formatDateKey(selectedTicket.operating_date)} />
              <DetailLine
                label={selectedTicket.ticket_created_at ? 'Date and Time Issued' : 'Date and Time Requested'}
                value={formatDateTime(selectedTicket.ticket_created_at || selectedTicket.reserved_at)}
              />
              <DetailLine label="Vehicle Plate & Body No." value={`${selectedTicket.vehicle_plate} / ${selectedTicket.vehicle_body_number}`} />
              {getClosureLabel(selectedTicket) ? <DetailLine label="Ticket Status" value={getClosureLabel(selectedTicket)!} /> : null}
              <View style={styles.referenceLine}>
                <Text style={styles.referenceLabel}>Ticket Reference Number:</Text>
                <Text style={styles.referenceValue}>{selectedTicket.ticket_reference || 'Not issued yet'}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSelectedTicket(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
              <View pointerEvents="none" style={styles.receiptSideNotchLeft} />
              <View pointerEvents="none" style={styles.receiptSideNotchRight} />
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>

      <Modal transparent visible={calendarOpen} animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.calendarBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calendarSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.calendarHeading}>
              <Pressable accessibilityLabel="Previous month" onPress={() => setVisibleMonth((month) => shiftMonth(month.year, month.month, -1))} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={17} color="#40565D" />
              </Pressable>
              <Text style={styles.sheetTitle}>{monthLabel}</Text>
              <Pressable
                accessibilityLabel="Next month"
                disabled={visibleMonth.year === currentMonth.year && visibleMonth.month >= currentMonth.month}
                onPress={() => setVisibleMonth((month) => shiftMonth(month.year, month.month, 1))}
                style={styles.monthButton}
              >
                <Ionicons name="chevron-forward" size={17} color={visibleMonth.year === currentMonth.year && visibleMonth.month >= currentMonth.month ? '#C6D0D3' : '#40565D'} />
              </Pressable>
            </View>
            <View style={styles.weekdays}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (day === null) return <View key={`blank-${index}`} style={styles.calendarCell} />;
                const key = makeDateKey(visibleMonth.year, visibleMonth.month, day);
                const disabled = key > todayKey;
                const selected = selectedDate === key;
                return (
                  <Pressable
                    key={key}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={formatDateKey(key)}
                    accessibilityState={{ selected, disabled }}
                    onPress={() => { setSelectedDate(key); setCalendarOpen(false); }}
                    style={styles.calendarCell}
                  >
                    <View style={[styles.dayCircle, selected && styles.selectedDay, disabled && styles.disabledDay]}>
                      <Text style={[styles.dayText, selected && styles.selectedDayText, disabled && styles.disabledDayText]}>{day}</Text>
                    </View>
                    {key === todayKey ? <View style={styles.todayDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => { setSelectedDate(null); setCalendarOpen(false); }} style={styles.allDatesButton}>
              <Text style={styles.allDatesText}>Show all records</Text>
            </Pressable>
            <Text style={styles.calendarGuide}>select date for previous records</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function TicketRow({ reservation, onPress }: { reservation: DriverReservationHistory; onPress: () => void }) {
  const issuedAt = reservation.ticket_created_at || reservation.reserved_at;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.ticketRow, pressed && styles.rowPressed]}>
      <TicketIcon />
      <View style={styles.ticketMain}>
        <Text style={styles.queueLabel}>Queue No.</Text>
        <Text style={styles.queueNumber}>{reservation.queue_display || '—'}</Text>
        <Text style={styles.timeText}>{formatTime(issuedAt)}</Text>
      </View>
      <StatusBadge reservation={reservation} />
      <Ionicons name="chevron-forward" size={23} color="#111111" />
    </Pressable>
  );
}

function TicketIcon({ large = false }: { large?: boolean }) {
  return (
    <View style={[styles.ticketIcon, large && styles.ticketIconLarge]}>
      <Ionicons name="ticket-outline" size={large ? 21 : 16} color="#08A99D" />
    </View>
  );
}

function StatusBadge({ reservation }: { reservation: DriverReservationHistory }) {
  const status = getTicketStatus(reservation);
  const badgeStyle = status === 'Pending' ? styles.pendingBadge : status === 'Approved' ? styles.approvedBadge : styles.closedBadge;
  return <View style={[styles.statusBadge, badgeStyle]}><Text style={styles.statusText}>{status}</Text></View>;
}

function StateView({ icon, message }: { icon: ReactNode; message: string }) {
  return <View style={styles.state}>{icon}<Text style={styles.stateText}>{message}</Text></View>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

const COLORS = { background: '#D3DFEA', header: '#0B423D', primary: '#00A99D', ink: '#111111' };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: COLORS.header },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  filterRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 19 },
  recordCount: { color: '#536873', fontSize: 11, fontWeight: '500' },
  filterButton: { maxWidth: '68%', minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6, paddingHorizontal: 8, backgroundColor: '#FFFFFF' },
  filterLabel: { maxWidth: 155, color: '#475860', fontSize: 9 },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 20 },
  group: { marginTop: 7, marginBottom: 15 },
  groupTitle: { minHeight: 24, color: '#64747B', fontSize: 11, fontWeight: '500', paddingHorizontal: 8, paddingTop: 6 },
  ticketRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 2, marginBottom: 3, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#B5BEC5', borderRadius: 16, backgroundColor: '#FFFFFF' },
  rowPressed: { opacity: 0.75 },
  ticketIcon: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#A5F5EB' },
  ticketIconLarge: { width: 42, height: 42, borderRadius: 10 },
  ticketMain: { flex: 1, flexDirection: 'column', gap: 3, alignItems: 'flex-start' },
  queueLabel: { color: '#555555', fontSize: 8, lineHeight: 9 },
  queueNumber: { color: '#111111', fontSize: 15, lineHeight: 18, fontWeight: '500' },
  timeText: { color: '#53585C', fontSize: 10, lineHeight: 8 },
  statusBadge: { minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  pendingBadge: { backgroundColor: '#00A6E9' },
  approvedBadge: { backgroundColor: '#8CDEA5' },
  closedBadge: { backgroundColor: '#7B7B7B' },
  statusText: { color: '#FFFFFF', fontSize: 8, fontWeight: '500' },
  state: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 25 },
  stateTitle: { color: '#354A53', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateText: { color: '#687C84', fontSize: 12, textAlign: 'center' },
  retryButton: { minHeight: 34, justifyContent: 'center', borderRadius: 6, marginTop: 6, paddingHorizontal: 18, backgroundColor: COLORS.primary },
  retryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  detailBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, backgroundColor: COLORS.background },
  receipt: { position: 'relative', width: '100%', maxWidth: 430, borderRadius: 8, padding: 15, backgroundColor: '#FFFFFF' },
  receiptTop: { minHeight: 75, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#222222', paddingHorizontal: 11 },
  receiptHeading: { flex: 1, alignItems: 'center' },
  receiptBrand: { color: '#111111', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  receiptSubtitle: { color: '#333333', fontSize: 9, textAlign: 'center' },
  receiptCutoutRow: { height: 30, flexDirection: 'row', alignItems: 'center' },
  receiptSideNotchLeft: { position: 'absolute', left: -10, top: 95, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.background },
  receiptSideNotchRight: { position: 'absolute', right: -10, top: 95, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.background },
  receiptDash: { flex: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#A9A9A9', marginHorizontal: 6 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  detailLabel: { flex: 1, color: '#222222', fontSize: 12, fontWeight: '600' },
  detailValue: { flex: 1, color: '#555555', fontSize: 12, textAlign: 'right' },
  referenceLine: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, borderTopWidth: 1, borderColor: '#AAAAAA', marginTop: 20, paddingTop: 12 },
  referenceLabel: { color: '#222222', fontSize: 12, fontWeight: '600' },
  referenceValue: { color: '#555555', fontSize: 12 },
  closeButton: { height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#9CA8AF', borderRadius: 5, marginTop: 17 },
  closeButtonText: { color: COLORS.ink, fontSize: 14 },
  calendarBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  calendarSheet: { borderTopLeftRadius: 19, borderTopRightRadius: 19, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: '#FFFFFF' },
  sheetHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, marginBottom: 16, backgroundColor: '#CFD8DC' },
  calendarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  monthButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: '#31474F', fontSize: 15, fontWeight: '700' },
  weekdays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5 },
  weekday: { width: '14.28%', color: '#829197', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', height: 42, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#00A86B' },
  selectedDay: { backgroundColor: COLORS.primary },
  disabledDay: { backgroundColor: 'transparent' },
  dayText: { color: '#394D54', fontSize: 12 },
  selectedDayText: { color: '#FFFFFF', fontWeight: '700' },
  disabledDayText: { color: '#C6D0D3' },
  allDatesButton: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 9, marginTop: 9 },
  allDatesText: { color: '#008F86', fontSize: 12, fontWeight: '700' },
  calendarGuide: { color: '#77868B', fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginTop: 1 },
});
