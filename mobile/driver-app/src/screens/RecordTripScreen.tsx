import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { endTrip, startTrip, type Trip } from '@/api/tripsAPI';
import DriverMap from '@/components/DriverMap';
import { NotificationBell } from '@/components/NotificationCenter';

export default function RecordTripScreen() {
  const [dispatch, setDispatch] = useState<CurrentDispatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const loadDispatch = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      setDispatch(await getCurrentDispatch());
    } catch {
      setDispatch(null);
      setMessage('Unable to load today’s dispatch.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadDispatch(); }, [loadDispatch]);

  const handleStart = useCallback(async () => {
    if (!dispatch || isStarting) return;
    setIsStarting(true);
    setMessage(null);
    try {
      setActiveTrip(await startTrip(dispatch.dispatch_id));
    } catch (error: any) {
      setMessage(error?.message || 'Unable to start this trip. Make sure the vehicle is marked Loading.');
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
    } finally { setIsFinishing(false); }
  }, [activeTrip]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <DriverMap fullScreen />
      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          {activeTrip ? <View style={styles.directionPill}><View style={styles.directionIcon}><Ionicons name="navigate" size={17} color="#D6FFFA" /></View><View><Text style={styles.heading}>Heading to</Text><Text style={styles.destination}>{dispatch?.route_label?.split('↔')[1]?.trim() || 'Destination'}</Text></View><View style={styles.distance}><Text style={styles.distanceValue}>-- km</Text><Text style={styles.heading}>remaining</Text></View></View> : <View style={styles.titlePill}><Ionicons name="navigate" size={17} color="#35E8D8" /><Text style={styles.title}>Start Trip</Text></View>}
          <View style={styles.topActions}>
            <NotificationBell />
            <Pressable accessibilityLabel="Refresh dispatch" onPress={() => void loadDispatch()} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={21} color="#E7FFFB" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.tripCard}>
        {isLoading ? (
          <View style={styles.loading}><ActivityIndicator color="#28E0D0" /><Text style={styles.secondaryText}>Loading dispatch…</Text></View>
        ) : dispatch && activeTrip ? (
          <>
            <View style={styles.routeRow}><View style={styles.routeText}><Ionicons name="car-sport-outline" size={15} color="#B7D9D4" /><Text style={styles.routeLabel}>{dispatch.route_label}</Text></View><View style={styles.outgoingPill}><Text style={styles.outgoingText}>{activeTrip.status === 'returning' ? 'Returning' : 'Outgoing'}</Text></View></View>
            <Text style={styles.nearby}>Live GPS tracking is active</Text><View style={styles.cardDivider} /><View style={styles.startRow}><View><Text style={styles.caption}>Elapsed time</Text><Text style={styles.readyText}>Trip in progress</Text></View><Pressable onPress={() => setFinishOpen(true)} style={styles.finishButton}><Text style={styles.startText}>Finish Trip</Text></Pressable></View>
          </>
        ) : dispatch ? (
          <>
            <View style={styles.routeRow}>
              <View style={styles.routeText}><Ionicons name="car-sport-outline" size={15} color="#B7D9D4" /><Text style={styles.routeLabel}>{dispatch.route_label}</Text></View>
              <View style={styles.outgoingPill}><Ionicons name="navigate" size={12} color="#8DEFE5" /><Text style={styles.outgoingText}>Outgoing</Text></View>
            </View>
            <Text style={styles.vehicleText}>{dispatch.vehicle_plate}</Text>
            <View style={styles.cardDivider} />
            <View style={styles.startRow}>
              <View><Text style={styles.caption}>Today’s assigned route</Text><Text style={styles.readyText}>Ready when vehicle is loading</Text></View>
              <Pressable onPress={() => void handleStart()} disabled={isStarting} style={[styles.startButton, isStarting && styles.startButtonDisabled]}>
                {isStarting ? <ActivityIndicator color="#003E3A" /> : <><Ionicons name="navigate-outline" size={19} color="#003E3A" /><Text style={styles.startText}>Start</Text></>}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.empty}><Ionicons name="calendar-outline" size={25} color="#9FCABD" /><Text style={styles.emptyTitle}>No dispatch for today</Text><Text style={styles.secondaryText}>Ask an administrator to assign your route and vehicle.</Text></View>
        )}
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
      <Modal transparent visible={finishOpen} animationType="slide" onRequestClose={() => setFinishOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFinishOpen(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.handle} /><Ionicons name="flag-outline" size={31} color="#2EE0D0" /><Text style={styles.sheetTitle}>Finish this trip?</Text><Text style={styles.sheetText}>Your current trip will be marked as completed.</Text><Pressable disabled={isFinishing} onPress={() => void handleFinish()} style={styles.confirmButton}>{isFinishing ? <ActivityIndicator color="#003E3A" /> : <Text style={styles.confirmText}>Finish Trip</Text>}</Pressable><Pressable onPress={() => setFinishOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable></Pressable></Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#042F2E' },
  overlay: { ...StyleSheet.absoluteFill, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titlePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(4, 31, 44, 0.92)' },
  directionPill: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 255, borderRadius: 26, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#06172D' },
  directionIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#19AD98' },
  heading: { color: '#B9D3DC', fontSize: 8 }, destination: { color: '#E9FFFF', fontSize: 18, fontWeight: '700' }, distance: { alignItems: 'flex-end', marginLeft: 'auto' }, distanceValue: { color: '#DDEEFF', fontSize: 17, fontWeight: '700' },
  title: { color: '#F2FFFC', fontSize: 17, fontWeight: '800' },
  refreshButton: { alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(4, 31, 44, 0.92)' },
  tripCard: { position: 'absolute', right: 12, bottom: 14, left: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(117, 190, 183, 0.25)', padding: 14, backgroundColor: 'rgba(3, 31, 46, 0.96)' },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  routeText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  routeLabel: { flexShrink: 1, color: '#E7FFFB', fontSize: 13, fontWeight: '700' },
  outgoingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#075D6B' },
  outgoingText: { color: '#B5FFF6', fontSize: 10, fontWeight: '700' },
  vehicleText: { marginTop: 4, color: '#A9D1CC', fontSize: 11 },
  cardDivider: { height: 1, marginVertical: 12, backgroundColor: 'rgba(169, 209, 204, 0.2)' },
  startRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  caption: { color: '#A9D1CC', fontSize: 9 },
  readyText: { marginTop: 2, color: '#E7FFFB', fontSize: 12, fontWeight: '600' },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 92, minHeight: 39, borderRadius: 20, paddingHorizontal: 16, backgroundColor: '#28E0D0' },
  startButtonDisabled: { opacity: 0.65 },
  finishButton: { minWidth: 100, minHeight: 39, borderRadius: 20, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1CAF8D' },
  startText: { color: '#003E3A', fontSize: 15, fontWeight: '800' },
  loading: { minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: 10 },
  empty: { minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { color: '#E7FFFB', fontSize: 14, fontWeight: '700' },
  secondaryText: { color: '#9FCABD', fontSize: 11, textAlign: 'center' },
  message: { marginTop: 10, color: '#D5FFFA', fontSize: 11, lineHeight: 15 },
  nearby: { color: '#B9D5D1', fontSize: 9, marginTop: 7 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.5)' },
  sheet: { backgroundColor: '#061C35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, alignItems: 'center' }, handle: { width: 82, height: 5, borderRadius: 3, backgroundColor: '#8293A3', marginBottom: 22 }, sheetTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 8 }, sheetText: { color: '#BED1DC', fontSize: 12, marginTop: 6 }, confirmButton: { height: 46, alignSelf: 'stretch', backgroundColor: '#25B596', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, confirmText: { color: '#003C38', fontWeight: '800', fontSize: 15 }, cancelButton: { height: 43, justifyContent: 'center' }, cancelText: { color: '#C4E8E3', fontWeight: '700' },
});
