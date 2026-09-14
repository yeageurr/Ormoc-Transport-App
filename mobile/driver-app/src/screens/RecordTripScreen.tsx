import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { startTrip } from '@/api/tripsAPI';
import DriverMap from '@/components/DriverMap';

export default function RecordTripScreen() {
  const [dispatch, setDispatch] = useState<CurrentDispatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      await startTrip(dispatch.dispatch_id);
      setMessage('Trip started. Your live location is being shared.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to start this trip. Make sure the vehicle is marked Loading.');
    } finally {
      setIsStarting(false);
    }
  }, [dispatch, isStarting]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <DriverMap fullScreen />
      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <View style={styles.titlePill}><Ionicons name="navigate" size={17} color="#35E8D8" /><Text style={styles.title}>Go</Text></View>
          <Pressable accessibilityLabel="Refresh dispatch" onPress={() => void loadDispatch()} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={21} color="#E7FFFB" />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.tripCard}>
        {isLoading ? (
          <View style={styles.loading}><ActivityIndicator color="#28E0D0" /><Text style={styles.secondaryText}>Loading dispatch…</Text></View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#042F2E' },
  overlay: { ...StyleSheet.absoluteFill, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  titlePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(4, 31, 44, 0.92)' },
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
  startText: { color: '#003E3A', fontSize: 15, fontWeight: '800' },
  loading: { minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: 10 },
  empty: { minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { color: '#E7FFFB', fontSize: 14, fontWeight: '700' },
  secondaryText: { color: '#9FCABD', fontSize: 11, textAlign: 'center' },
  message: { marginTop: 10, color: '#D5FFFA', fontSize: 11, lineHeight: 15 },
});
