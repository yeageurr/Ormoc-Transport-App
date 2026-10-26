import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import GradientText from '@/components/GradientText';

const COLORS = {
  background: '#A9E4FF',
  logoBlue: '#009CE5',
  title: '#006D9B',
  accent: '#148FD0',
  text: '#101820',
};

export default function EntranceScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const logoEntrance = useSharedValue(0);
  const labelsEntrance = useSharedValue(0);
  const guideOpacity = useSharedValue(0.45);
  const exitOpacity = useSharedValue(1);
  const navigationStarted = useRef(false);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const entranceTiming = { duration: 560, easing: Easing.out(Easing.cubic) };
    logoEntrance.value = withTiming(1, entranceTiming);
    labelsEntrance.value = withDelay(150, withTiming(1, entranceTiming));
  }, [labelsEntrance, logoEntrance]);

  useEffect(() => {
    guideOpacity.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [guideOpacity]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoEntrance.value,
    transform: [{ translateY: interpolate(logoEntrance.value, [0, 1], [45, 0]) }],
  }));
  const labelsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelsEntrance.value,
    transform: [{ translateY: interpolate(labelsEntrance.value, [0, 1], [45, 0]) }],
  }));
  const guideAnimatedStyle = useAnimatedStyle(() => ({ opacity: guideOpacity.value }));
  const exitAnimatedStyle = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));

  const continueToIntroduction = () => {
    if (navigationStarted.current) return;
    navigationStarted.current = true;
    exitOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
    setTimeout(() => {
      router.push({ pathname: '/introduction', params: { introDelay: '350' } } as Href);
    }, 300);
  };

  return (
    <View style={styles.screen}>
      <StatusBar hidden />

      <Animated.View style={[styles.screenContent, exitAnimatedStyle]}>
      <View style={[styles.welcomeGroup, { top: height * 0.182 }]}>
        <Animated.View style={[styles.logoCircle, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/ormoc-transport-logo.png')}
            contentFit="contain"
            style={styles.logo}
            accessibilityLabel="Ormoc City transport logo"
          />
        </Animated.View>

        <Animated.View style={[styles.welcomeLabels, labelsAnimatedStyle]}>
          <Text style={styles.greeting}>Welcome, fellow</Text>
          <GradientText style={{ fontSize: 29, fontFamily: 'Poppins_600SemiBold' }}>
            Ormocanons!
          </GradientText>
        </Animated.View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tap to continue"
        onPress={continueToIntroduction}
        style={[styles.continueTapArea, { bottom: Math.max(insets.bottom, 10) + 24 }]}>
        <Animated.Text style={[styles.continueText, guideAnimatedStyle]}>Tap to continue</Animated.Text>
      </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContent: {
    flex: 1,
  },
  welcomeGroup: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.logoBlue,
    marginBottom: 1,
  },
  logo: {
    width: 150,
    height: 150,
  },
  welcomeLabels: {
    marginTop: 10,
    alignItems: 'center',
  },
  greeting: {
    color: COLORS.text,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  title: {
    color: COLORS.title,
    fontFamily: 'Poppins_500Medium',
    fontSize: 29,
    fontWeight: '600',
    lineHeight: 36,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  titleAccent: {
    color: COLORS.accent,
  },
  continueText: {
    color: '#208ED6',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 24,
    includeFontPadding: true,
    textAlign: 'center',
  },
  continueTapArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 12,
  },
});
