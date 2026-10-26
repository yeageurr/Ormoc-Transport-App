import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CommuterRoute } from '@/api/publicAPI';

type Props = {
  visible: boolean;
  routes: CommuterRoute[];
  onJoin: (routeId: number) => Promise<void>;
  onNoThanks: () => void;
  onContinue: () => void;
};

type FlowStep = 'choose-route' | 'adding' | 'success';

function LoadingDot({ color, position, delay }: { color: string; position: 'top' | 'left' | 'right'; delay: number }) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  const positionStyle = position === 'top' ? styles.loadingDotTop : position === 'left' ? styles.loadingDotLeft : styles.loadingDotRight;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.55, duration: 450, useNativeDriver: true }),
      Animated.delay(500 - delay),
    ]));
    animation.start();
    return () => animation.stop();
  }, [delay, opacity]);

  return <Animated.View style={[styles.loadingDot, positionStyle, { backgroundColor: color, opacity }]} />;
}

export default function PassengerQueueFlow({ visible, routes, onJoin, onNoThanks, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<FlowStep>('choose-route');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setStep('choose-route');
      setSelectedRouteId(null);
      setError('');
    }
  }, [visible]);

  const submit = async () => {
    if (selectedRouteId == null) return;
    setError('');
    setStep('adding');
    try {
      await onJoin(selectedRouteId);
      setStep('success');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not add you to the queue. Try again.');
      setStep('choose-route');
    }
  };

  const dismiss = () => {
    setStep('choose-route');
    setSelectedRouteId(null);
    setError('');
    onNoThanks();
  };

  const continueToMap = () => {
    setStep('choose-route');
    setSelectedRouteId(null);
    setError('');
    onContinue();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={step === 'choose-route' ? dismiss : undefined}>
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 24) + 18, paddingBottom: Math.max(insets.bottom, 18) + 12 }]}>
        <View style={styles.brand}>
          <Image source={require('@/assets/images/ormoc-transport-logo.png')} contentFit="contain" style={styles.brandIcon} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>Ormoc Transport App</Text>
            <Text style={styles.brandSubtitle}>Commuter App</Text>
          </View>
        </View>

        {step === 'choose-route' && (
          <View style={styles.routePrompt}>
            <Text style={styles.promptTitle}>Going somewhere?</Text>
            <Text style={styles.promptCaption}>Select your route</Text>
            <ScrollView style={styles.routeScroll} contentContainerStyle={styles.routeList} showsVerticalScrollIndicator={false}>
              {routes.map((route) => {
                const selected = selectedRouteId === route.route_id;
                return (
                  <Pressable
                    key={route.route_id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setSelectedRouteId(route.route_id)}
                    style={[styles.routeOption, selected && styles.routeOptionSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioCenter} />}
                    </View>
                    <Text style={styles.routeName}>{route.destination_name}</Text>
                  </Pressable>
                );
              })}
              {routes.length === 0 && <Text style={styles.emptyRoutes}>No routes are available right now.</Text>}
            </ScrollView>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              disabled={selectedRouteId == null}
              onPress={() => void submit()}
              style={[styles.nextButton, selectedRouteId == null && styles.nextButtonDisabled]}
            >
              <Text style={styles.nextText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={dismiss} style={styles.noThanksButton}>
              <Text style={styles.noThanksText}>No thanks</Text>
            </Pressable>
          </View>
        )}

        {step === 'adding' && (
          <View style={styles.centerState}>
            <View style={styles.loadingDots}>
              <LoadingDot color="#23485A" position="top" delay={0} />
              <LoadingDot color="#36B0E5" position="left" delay={140} />
              <LoadingDot color="#607F8C" position="right" delay={280} />
            </View>
            <Text style={styles.stateTitle}>Adding you in the queue</Text>
            <Text style={styles.stateCaption}>This will take shortly...</Text>
          </View>
        )}

        {step === 'success' && (
          <Pressable accessibilityRole="button" onPress={continueToMap} style={styles.centerState}>
            <Ionicons name="sparkles-outline" size={54} color="#008FCB" />
            <Text style={[styles.stateTitle, styles.successTitle]}>Hooray! You are now in the passengers’ queue.</Text>
            <Text style={styles.stateCaption}>Tap to continue</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 25, backgroundColor: '#A9E4FF' },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  brandIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#008FD0' },
  brandCopy: { flexShrink: 1 },
  brandTitle: { color: '#258FBC', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  brandSubtitle: { color: '#17343D', fontFamily: 'Poppins_400Regular_Italic', fontSize: 11 },
  routePrompt: { flex: 1, paddingTop: 38 },
  promptTitle: { marginBottom: 24, color: '#111820', fontFamily: 'Poppins_600SemiBold', fontStyle: 'italic', fontSize: 22, textAlign: 'center' },
  promptCaption: { marginBottom: 10, color: '#162F3A', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  routeScroll: { flexGrow: 0, maxHeight: 330 },
  routeList: { gap: 8, paddingHorizontal: 8, paddingBottom: 4 },
  routeOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, borderWidth: 1, borderColor: '#6CB9D5', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  routeOptionSelected: { borderColor: '#008FCB', backgroundColor: 'rgba(255,255,255,0.4)' },
  radio: { width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3984A0', borderRadius: 8 },
  radioSelected: { borderColor: '#008FCB' },
  radioCenter: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#008FCB' },
  routeName: { color: '#1D3B4A', fontFamily: 'Poppins_500Medium', fontSize: 15 },
  emptyRoutes: { padding: 18, color: '#355563', fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center' },
  errorText: { marginTop: 9, color: '#9E2B2B', fontFamily: 'Poppins_400Regular', fontSize: 11 },
  nextButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, borderRadius: 6, backgroundColor: '#00A99D' },
  nextButtonDisabled: { opacity: 0.48 },
  nextText: { color: '#FFFFFF', fontFamily: 'Poppins_500Medium', fontSize: 15 },
  noThanksButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  noThanksText: { color: '#315565', fontFamily: 'Poppins_500Medium', fontSize: 13, textDecorationLine: 'underline' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  loadingDots: { width: 88, height: 60, alignItems: 'center', justifyContent: 'center' },
  loadingDot: { position: 'absolute', width: 20, height: 20, borderRadius: 10 },
  loadingDotTop: { top: 0 },
  loadingDotLeft: { bottom: 3, left: 13 },
  loadingDotRight: { bottom: 3, right: 13 },
  stateTitle: { marginTop: 12, color: '#23485A', fontFamily: 'Poppins_600SemiBold', fontStyle: 'italic', fontSize: 20, textAlign: 'center' },
  stateCaption: { marginTop: 34, color: '#183B4C', fontFamily: 'Poppins_400Regular_Italic', fontSize: 11 },
  successTitle: { marginTop: 18 },
});
