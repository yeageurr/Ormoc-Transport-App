import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTripLogs, type DriverTrip } from '@/api/tripsAPI';
import { NotificationBell } from '@/components/NotificationCenter';

function getManilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getManilaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
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
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function monthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month, 1)));
}

function getRelativeDateKeys() {
  const now = new Date();
  const today = getManilaDateKey(now);
  const yesterday = getManilaDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  return { today, yesterday };
}

function getDateHeading(date: Date, today: string, yesterday: string) {
  const dateKey = getManilaDateKey(date);
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return 'In progress';
  const rounded = Math.round(minutes);
  return `${rounded} min${rounded === 1 ? '' : 's'}`;
}

export default function TripLogsScreen() {
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>(
    () => getManilaDateParts(new Date()),
  );

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(false);
    try {
      setTrips(await getTripLogs());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refreshTrips = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const { today, yesterday } = getRelativeDateKeys();
  const groups = useMemo(() => {
    const matchingTrips = trips.filter((trip) => {
      if (!selectedDate) return true;
      const tripDate = getManilaDateKey(new Date(trip.time_departed));
      return tripDate === selectedDate;
    });
    const grouped = new Map<string, DriverTrip[]>();

    matchingTrips.forEach((trip) => {
      const date = new Date(trip.time_departed);
      const key = getManilaDateKey(date);
      const group = grouped.get(key) ?? [];
      group.push(trip);
      grouped.set(key, group);
    });

    return [...grouped.entries()].map(([key, items]) => ({
      key,
      title: getDateHeading(new Date(items[0].time_departed), today, yesterday),
      items,
    }));
  }, [selectedDate, today, trips, yesterday]);

  const currentMonth = getManilaDateParts(new Date());
  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);
  const filterLabel = selectedDate ? formatDateKey(selectedDate) : 'Filter by date';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#075E56" />
      <View style={styles.header}>
        <Text style={styles.title}>Trip Logs</Text>
        <NotificationBell />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.tripCount}>{loading ? 'Loading trips…' : `${trips.length} recorded trips`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Filter trips: ${filterLabel}`} onPress={() => {
          const month = selectedDate
            ? getManilaDateParts(new Date(`${selectedDate}T12:00:00+08:00`))
            : currentMonth;
          setVisibleMonth(month);
          setCalendarOpen(true);
        }} style={styles.filterButton}>
          <Ionicons name="calendar-outline" size={13} color="#52636A" />
          <Text style={styles.filterLabel}>{filterLabel}</Text>
          <Ionicons name="chevron-down" size={12} color="#52636A" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshTrips()}
            tintColor="#009E91"
            colors={['#009E91']}
          />
        )}
      >
        {loading ? (
          <View style={styles.state}><ActivityIndicator color="#009E91" /><Text style={styles.stateText}>Loading your trip history…</Text></View>
        ) : error ? (
          <View style={styles.state}>
            <Ionicons name="cloud-offline-outline" size={28} color="#688089" />
            <Text style={styles.stateTitle}>Couldn’t load trip logs</Text>
            <Text style={styles.stateText}>Check your connection and try again.</Text>
            <Pressable onPress={() => void load()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : groups.length ? (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupDate}>{group.title === 'Today' ? `${group.items.length} trips` : group.title === 'Yesterday' ? `${group.items.length} trips` : ''}</Text>
              </View>
              {group.items.map((trip) => <TripLogRow key={trip.trip_id} trip={trip} />)}
            </View>
          ))
        ) : (
          <View style={styles.state}>
            <Ionicons name="file-tray-outline" size={30} color="#688089" />
            <Text style={styles.stateTitle}>No trips found</Text>
            <Text style={styles.stateText}>{selectedDate ? `No trips recorded on ${formatDateKey(selectedDate)}.` : 'Completed trips will appear here.'}</Text>
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={calendarOpen} animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.filterSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.calendarHeading}>
              <Pressable accessibilityLabel="Previous month" onPress={() => setVisibleMonth((month) => shiftMonth(month.year, month.month, -1))} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={17} color="#40565D" />
              </Pressable>
              <Text style={styles.sheetTitle}>{monthTitle(visibleMonth.year, visibleMonth.month)}</Text>
              <Pressable
                accessibilityLabel="Next month"
                disabled={visibleMonth.year === currentMonth.year && visibleMonth.month >= currentMonth.month}
                onPress={() => setVisibleMonth((month) => shiftMonth(month.year, month.month, 1))}
                style={styles.monthButton}>
                <Ionicons name="chevron-forward" size={17} color={visibleMonth.year === currentMonth.year && visibleMonth.month >= currentMonth.month ? '#C6D0D3' : '#40565D'} />
              </Pressable>
            </View>
            <View style={styles.weekdays}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => <Text key={`${weekday}-${index}`} style={styles.weekday}>{weekday}</Text>)}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (day === null) return <View key={`blank-${index}`} style={styles.calendarCell} />;
                const dateKey = makeDateKey(visibleMonth.year, visibleMonth.month, day);
                const disabled = dateKey > today;
                const selected = selectedDate === dateKey;
                return (
                  <Pressable
                    key={dateKey}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={formatDateKey(dateKey)}
                    accessibilityState={{ selected, disabled }}
                    onPress={() => { setSelectedDate(dateKey); setCalendarOpen(false); }}
                    style={styles.calendarCell}>
                    <View style={[styles.dayCircle, selected && styles.selectedDay, disabled && styles.disabledDay]}>
                      <Text style={[styles.dayText, selected && styles.selectedDayText, disabled && styles.disabledDayText]}>{day}</Text>
                    </View>
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

function TripLogRow({ trip }: { trip: DriverTrip }) {
  const isReturning = trip.status === 'returning';
  const directionColor = isReturning ? '#49B67D' : '#5CA0DE';

  return (
    <View style={styles.tripRow}>
      <View style={styles.tripLeft}>
        <View style={styles.vehicleLine}>
          <Ionicons name="car-sport-outline" size={12} color="#677780" />
          <Text style={styles.plate} numberOfLines={1}>{trip.vehicle_plate ?? `Trip #${trip.trip_id}`}</Text>
        </View>
        <View style={styles.tripInfo}>
          <View style={[styles.directionIcon, { backgroundColor: directionColor }]}>
            <Ionicons name={isReturning ? 'arrow-down' : 'arrow-up'} size={15} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.directionLabel}>{isReturning ? 'Returning' : 'Outgoing'}{trip.is_complete ? ' - Completed' : ' - In progress'}</Text>
            <Text style={styles.departureTime}>{formatTime(trip.time_departed)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.tripRight}>
        <Text style={styles.routeLabel} numberOfLines={2}>{trip.route_label ?? 'Assigned route'}</Text>
        <Text style={styles.tripMeta} numberOfLines={1}>
          {formatDuration(trip.trip_duration_minutes)} · {trip.average_speed_km === null ? '— km/h' : `${Math.round(trip.average_speed_km)} km/h`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DCE6F0' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, backgroundColor: '#075E56' },
  title: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  filterRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  tripCount: { color: '#536873', fontSize: 12, fontWeight: '600' },
  filterButton: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#CED7DF', borderRadius: 6, paddingHorizontal: 9, backgroundColor: '#FFFFFF' },
  filterLabel: { color: '#475860', fontSize: 12, fontWeight: '600' },
  content: { flexGrow: 1, marginHorizontal: 12, marginBottom: 8, borderRadius: 6, paddingHorizontal: 9, paddingBottom: 20, backgroundColor: '#FFFFFF' },
  group: { marginTop: 9 },
  groupHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 5, paddingHorizontal: 8, backgroundColor: '#D9E3ED' },
  groupTitle: { color: '#66757D', fontSize: 10, fontWeight: '700' },
  groupDate: { color: '#7A878E', fontSize: 8 },
  tripRow: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginHorizontal: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#B7C1C8', paddingVertical: 6 },
  tripLeft: { flex: 1, minWidth: 0 },
  vehicleLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2, paddingLeft: 3 },
  plate: { color: '#79868C', fontSize: 8, fontWeight: '600' },
  tripInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  directionIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  directionLabel: { color: '#4F5C62', fontSize: 10, fontWeight: '700' },
  departureTime: { color: '#64747B', fontSize: 8 },
  tripRight: { flex: 1.15, alignItems: 'flex-end' },
  routeLabel: { color: '#4D575D', fontSize: 10, fontWeight: '700', textAlign: 'right' },
  tripMeta: { marginTop: 4, color: '#66747A', fontSize: 8, textAlign: 'right' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 55 },
  stateTitle: { color: '#354A53', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  stateText: { color: '#687C84', fontSize: 12, textAlign: 'center' },
  retryButton: { minHeight: 34, justifyContent: 'center', borderRadius: 6, marginTop: 6, paddingHorizontal: 18, backgroundColor: '#009E91' },
  retryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  filterSheet: { borderTopLeftRadius: 19, borderTopRightRadius: 19, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: '#FFFFFF' },
  sheetHandle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 3, marginBottom: 13, backgroundColor: '#C8D1D5' },
  calendarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F0F4F6' },
  sheetTitle: { color: '#334A52', fontSize: 15, fontWeight: '800' },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: '14.2857%', color: '#7A898F', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', height: 39, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  selectedDay: { backgroundColor: '#009E91' },
  disabledDay: { opacity: 0.35 },
  dayText: { color: '#40555D', fontSize: 12 },
  selectedDayText: { color: '#FFFFFF', fontWeight: '800' },
  disabledDayText: { color: '#A7B2B6' },
  allDatesButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', marginTop: 5, borderRadius: 6, backgroundColor: '#EAF3F2' },
  allDatesText: { color: '#008F83', fontSize: 11, fontWeight: '700' },
  calendarGuide: { marginTop: 9, color: '#78868B', fontSize: 10, fontStyle: 'italic', textAlign: 'center' },
});
