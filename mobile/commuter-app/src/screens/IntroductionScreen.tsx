import { Image } from 'expo-image';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import GradientText from '@/components/GradientText';

const COLORS = {
  background: '#A9E4FF',
  blue: '#008FD0',
  darkBlue: '#006D9B',
  text: '#101820',
};

const steps = [
  'Open the app.',
  'Select your destination.',
  'Click vehicles on the map for details.',
  'Check for ETA and wait for the nearest trip.',
];

function MapIllustration({
  phoneProgress,
  dialogueOneProgress,
  dialogueTwoProgress,
  dialogueThreeProgress,
}: {
  phoneProgress: SharedValue<number>;
  dialogueOneProgress: SharedValue<number>;
  dialogueTwoProgress: SharedValue<number>;
  dialogueThreeProgress: SharedValue<number>;
}) {
  const phonePop = useAnimatedStyle(() => ({
    opacity: phoneProgress.value,
    transform: [{ scale: interpolate(phoneProgress.value, [0, 1], [0, 1]) }],
  }));
  const dialogueOnePop = useAnimatedStyle(() => ({
    opacity: dialogueOneProgress.value,
    transform: [{ scale: interpolate(dialogueOneProgress.value, [0, 1], [0, 1]) }],
  }));
  const dialogueTwoPop = useAnimatedStyle(() => ({
    opacity: dialogueTwoProgress.value,
    transform: [{ scale: interpolate(dialogueTwoProgress.value, [0, 1], [0, 1]) }],
  }));
  const dialogueThreePop = useAnimatedStyle(() => ({
    opacity: dialogueThreeProgress.value,
    transform: [{ scale: interpolate(dialogueThreeProgress.value, [0, 1], [0, 1]) }],
  }));

  return (
    <View accessible accessibilityLabel="A phone showing the live map with three vehicle callouts" style={styles.mapIllustration}>
      <Animated.View style={[styles.phoneFrame, phonePop]}>
        <View style={styles.phoneScreen}>
          <View style={[styles.road, styles.roadOne]} />
          <View style={[styles.road, styles.roadTwo]} />
          <View style={[styles.road, styles.roadThree]} />
          <View style={[styles.road, styles.roadFour]} />
          <View style={styles.routeLine} />
          <View style={styles.vehicleDot} />
        </View>
        <Image source={require('@/assets/images/introduction/phone.png')} contentFit="fill" style={styles.phoneImage} />
      </Animated.View>
      <Animated.View style={[styles.dialogue, styles.dialogueTwo, dialogueOnePop]}>
        <Image source={require('@/assets/images/introduction/dialogue-1.png')} contentFit="fill" style={styles.dialogueOneImage} />
      </Animated.View>
      <Animated.View style={[styles.dialogue, styles.dialogueOne, dialogueTwoPop]}>
        <Image source={require('@/assets/images/introduction/dialogue-2.png')} contentFit="fill" style={styles.dialogueTwoImage} />
      </Animated.View>
      <Animated.View style={[styles.dialogue, styles.dialogueThree, dialogueThreePop]}>
        <Image source={require('@/assets/images/introduction/dialogue-3.png')} contentFit="fill" style={styles.dialogueThreeImage} />
      </Animated.View>
    </View>
  );
}

export default function IntroductionScreen() {
  const router = useRouter();
  const { introDelay } = useLocalSearchParams<{ introDelay?: string }>();
  const initialDelay = introDelay === '350' ? 350 : 0;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 760;

  const headerProgress = useSharedValue(0);
  const descriptionProgress = useSharedValue(0);
  const phoneProgress = useSharedValue(0);
  const dialogueOneProgress = useSharedValue(0);
  const dialogueTwoProgress = useSharedValue(0);
  const dialogueThreeProgress = useSharedValue(0);
  const stepsIntroProgress = useSharedValue(0);
  const stepOneProgress = useSharedValue(0);
  const stepTwoProgress = useSharedValue(0);
  const stepThreeProgress = useSharedValue(0);
  const stepFourProgress = useSharedValue(0);
  const guideOpacity = useSharedValue(0);
  const stepProgress = [stepOneProgress, stepTwoProgress, stepThreeProgress, stepFourProgress];

  useEffect(() => {
    const entrance = { duration: 560, easing: Easing.out(Easing.cubic) };
    const popup = { duration: 380, easing: Easing.out(Easing.back(1.25)) };
    const slideIn = { duration: 420, easing: Easing.out(Easing.cubic) };

    // Keep the entrance screen's fade and short upward rise for the brand and copy.
    headerProgress.value = withDelay(initialDelay, withTiming(1, entrance));
    descriptionProgress.value = withDelay(initialDelay + 150, withTiming(1, entrance));

    // After the description, pop the phone and its three callouts in order.
    phoneProgress.value = withDelay(initialDelay + 800, withTiming(1, popup));
    dialogueOneProgress.value = withDelay(initialDelay + 1200, withTiming(1, popup));
    dialogueTwoProgress.value = withDelay(initialDelay + 1380, withTiming(1, popup));
    dialogueThreeProgress.value = withDelay(initialDelay + 1560, withTiming(1, popup));

    // Finish with the instructions traveling in from left to right.
    stepsIntroProgress.value = withDelay(initialDelay + 1980, withTiming(1, slideIn));
    stepProgress.forEach((progress, index) => {
      progress.value = withDelay(initialDelay + 2090 + index * 125, withTiming(1, slideIn));
    });
    guideOpacity.value = withDelay(
      initialDelay + 3000,
      withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, [
    descriptionProgress,
    dialogueOneProgress,
    dialogueThreeProgress,
    dialogueTwoProgress,
    headerProgress,
    guideOpacity,
    phoneProgress,
    stepOneProgress,
    stepTwoProgress,
    stepThreeProgress,
    stepFourProgress,
    stepsIntroProgress,
    initialDelay,
  ]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: interpolate(headerProgress.value, [0, 1], [45, 0]) }],
  }));
  const descriptionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: descriptionProgress.value,
    transform: [{ translateY: interpolate(descriptionProgress.value, [0, 1], [45, 0]) }],
  }));
  const stepsIntroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepsIntroProgress.value,
    transform: [{ translateX: interpolate(stepsIntroProgress.value, [0, 1], [-24, 0]) }],
  }));
  const guideAnimatedStyle = useAnimatedStyle(() => ({ opacity: guideOpacity.value }));
  // Each instruction enters from the left, in a short staggered succession.
  const stepOneAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepOneProgress.value,
    transform: [{ translateX: interpolate(stepOneProgress.value, [0, 1], [-24, 0]) }],
  }));
  const stepTwoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepTwoProgress.value,
    transform: [{ translateX: interpolate(stepTwoProgress.value, [0, 1], [-24, 0]) }],
  }));
  const stepThreeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepThreeProgress.value,
    transform: [{ translateX: interpolate(stepThreeProgress.value, [0, 1], [-24, 0]) }],
  }));
  const stepFourAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepFourProgress.value,
    transform: [{ translateX: interpolate(stepFourProgress.value, [0, 1], [-24, 0]) }],
  }));
  const stepAnimatedStyles = [stepOneAnimatedStyle, stepTwoAnimatedStyle, stepThreeAnimatedStyle, stepFourAnimatedStyle];

  const continueToMap = () => router.replace('/main' as Href);

  return (
    <View style={styles.screen}>
      <StatusBar hidden />

      <Animated.View style={[styles.header, { top: Math.max(insets.top, 20) + 4, width: width - 32 }, headerAnimatedStyle]}>
        <Image source={require('@/assets/images/introduction/intro-logo.png')} contentFit="contain" style={styles.brandMark} />
        <View style={styles.brandCopy}>
          <GradientText style={{ fontSize: 20, fontFamily: 'Poppins_600SemiBold' }}>
            OTA - <Text style={{fontStyle: 'italic', fontFamily: 'Poppins_600SemiBold'}}> Commuter's App </Text>
          </GradientText>
          <Text style={styles.brandSubtitle}>Ormoc Transport App for commuters</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.description, { top: height * (compact ? 0.185 : 0.188), width: width - 74 }, descriptionAnimatedStyle]}>
        <Text style={styles.descriptionText}>
          <Text style={styles.descriptionEmphasis}>OTA - Commuter’s App</Text> is a mobile app designed to provide real-time PUV-tracking application for commuters.
        </Text>
      </Animated.View>

      <View style={[styles.howTo, { top: height * (compact ? 0.335 : 0.342), width: width - 30 }]}>
        <MapIllustration
          phoneProgress={phoneProgress}
          dialogueOneProgress={dialogueOneProgress}
          dialogueTwoProgress={dialogueTwoProgress}
          dialogueThreeProgress={dialogueThreeProgress}
        />
        <View style={styles.stepsColumn}>
          <Animated.Text style={[styles.stepsIntro, stepsIntroAnimatedStyle]}>
            Instead of waiting in line for hours for the next trip...
          </Animated.Text>
          {steps.map((step, index) => (
            <Animated.View key={step} style={[styles.stepRow, stepAnimatedStyles[index]]}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tap to continue to the live map"
        onPress={continueToMap}
        style={[styles.continueTapArea, { bottom: Math.max(insets.bottom, 10) + 34 }]}>
        <Animated.Text style={[styles.continueText, guideAnimatedStyle]}>Tap to continue</Animated.Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { position: 'absolute', alignSelf: 'center', height: 102, flexDirection: 'row', alignItems: 'center', },
  brandMark: { width: 118, height: 100 },
  brandCopy: { flex: 1, paddingLeft: 8, paddingTop: 13 },
  brandSubtitle: { color: COLORS.darkBlue, fontFamily: 'Poppins_400Regular_Italic', fontSize: 11, lineHeight: 15 },
  description: { position: 'absolute', alignSelf: 'center', margin: 25 },
  descriptionText: { color: COLORS.text, fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 21 },
  descriptionEmphasis: { color: COLORS.blue, fontFamily: 'Poppins_700Bold', fontStyle: 'italic' },
  howTo: { position: 'absolute', alignSelf: 'center', flexDirection: 'column', alignItems: 'center', marginTop: 15, gap: 5, flex: 1 },
  mapIllustration: { width: '47%', height: 174, position: 'relative', marginBottom: 25 },
  phoneScreen: { position: 'absolute', left: 1, top: 9, width: 69, height: 128, overflow: 'hidden', borderRadius: 6, backgroundColor: '#F6F2DD' },
  phoneFrame: { position: 'absolute', left: 26, top: 23, width: 72, height: 144, zIndex: 1 },
  phoneImage: { width: 72, height: 144 },
  road: { position: 'absolute', height: 5, borderRadius: 2, backgroundColor: '#FFFFFF', borderColor: '#D6D1BC', borderWidth: 0.7 },
  roadOne: { width: 104, top: 27, left: -15, transform: [{ rotate: '62deg' }] },
  roadTwo: { width: 97, top: 70, left: -13, transform: [{ rotate: '-49deg' }] },
  roadThree: { width: 96, top: 101, left: -15, transform: [{ rotate: '21deg' }] },
  roadFour: { width: 94, top: 50, left: -13, transform: [{ rotate: '8deg' }] },
  routeLine: { position: 'absolute', width: 3, height: 111, left: 34, top: 9, borderRadius: 3, backgroundColor: '#66B8F2', transform: [{ rotate: '-20deg' }] },
  vehicleDot: { position: 'absolute', top: 39, left: 29, width: 9, height: 9, borderRadius: 5, backgroundColor: '#2866CF', borderWidth: 1, borderColor: '#FFFFFF' },
  dialogue: { position: 'absolute', zIndex: 2 },
  dialogueOne: { left: -50, top: 0, width: 59, height: 34 },
  dialogueTwo: { left: 75, top: 35, width: 85, height: 50 },
  dialogueThree: { left: -45, top: 75, width: 67, height: 39 },
  dialogueOneImage: { width: 100, height: 65 },
  dialogueTwoImage: { width: 100, height: 65 },
  dialogueThreeImage: { width: 100, height: 65 },
  stepsColumn: { flex: 1, paddingTop: 0, paddingLeft: 3, width: '100%' },
  stepsIntro: { color: COLORS.blue, fontFamily: 'Poppins_500Medium', fontSize: 16, lineHeight: 13, marginBottom: 7 },
  stepRow: { minHeight: 35, flexDirection: 'row', alignItems: 'center', marginBottom: 1, gap: 8, marginTop: 2,  },
  stepNumber: { width: 23, height: 23, borderRadius: '100%', borderWidth: 2, borderColor: '#269DD9', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  stepNumberText: { color: COLORS.blue, fontFamily: 'Poppins_600SemiBold', fontSize: 13, lineHeight: 12 },
  stepText: { flex: 1, color: '#007DC3', fontFamily: 'Poppins_500Medium', fontSize: 15,  },
  continueTapArea: { position: 'absolute', left: 0, right: 0, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  continueText: { color: '#208ED6', fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 28, includeFontPadding: false, textAlign: 'center' },
});
