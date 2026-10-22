import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export default function EntranceScreen() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const promptOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  useEffect(() => {
    promptOpacity.value = withRepeat(
      withTiming(0.48, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [promptOpacity]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));
  const promptStyle = useAnimatedStyle(() => ({ opacity: promptOpacity.value }));
  const navigateToLogin = () => router.replace('/login');

  const continueToLogin = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    contentOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }, (finished) => {
      'worklet';
      if (finished) scheduleOnRN(navigateToLogin);
    });
    contentTranslateY.value = withTiming(-36, { duration: 300, easing: Easing.out(Easing.ease) });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.screen.backgroundColor} />

      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.brandBlock}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.logoWrap}>
            <Image
              source={require('@/assets/images/ormoc-driver-mark.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Ormoc City bus logo"
            />
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(500).delay(140)} style={styles.title}>
            Ormoc Transport App
          </Animated.Text>
          <Animated.Text entering={FadeIn.duration(650).delay(260)} style={styles.subtitle}>
            for drivers
          </Animated.Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue to driver login"
          accessibilityState={{ disabled: isTransitioning }}
          disabled={isTransitioning}
          onPress={continueToLogin}
          style={({ pressed }) => [styles.continueTarget, pressed && styles.continuePressed]}
        >
          <Animated.Text style={[styles.continueText, promptStyle]}>
            Tap to continue
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#D3DFEA',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  brandBlock: {
    position: 'absolute',
    top: '18.2%',
    alignItems: 'center',
    width: '100%',
  },
  logoWrap: {
    width: 150,
    height: 150,
    marginBottom: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#2499CC',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 25,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    color: '#333B41',
    fontFamily: 'Poppins_300Light_Italic',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  continueTarget: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 42,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continuePressed: {
    opacity: 0.72,
  },
  continueText: {
    color: '#168BC6',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
  },
});
