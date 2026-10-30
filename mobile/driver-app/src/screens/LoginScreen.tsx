import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { getCurrentUser, loginDriver } from '@/api/authAPI';
import { useAuth } from '@/hooks/useAuth';

const riseIn = (delay: number) => FadeInDown.duration(460).delay(delay);

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (): Promise<void> => {
    if (!username.trim() || !password) {
      setError('Please enter your username or phone and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await loginDriver(username.trim(), password);
      // Read the persisted account state with the newly saved token. The login
      // response is a fallback if this follow-up request hits a transient error.
      const account = await getCurrentUser().catch(() => response.user);
      const requiresPasswordChange = Boolean(
        account.must_change_password ?? response.must_change_password,
      );
      signIn(account.first_name, requiresPasswordChange);
      router.replace((requiresPasswordChange ? '/change-password' : '/tabs') as never);
    } catch (loginError) {
      if (axios.isAxiosError(loginError)) {
        const detail = loginError.response?.data?.error?.message || loginError.response?.data?.detail;
        setError(
          loginError.response?.status === 401
            ? "Account doesn't exist."
            : loginError.response?.status === 403 && detail?.toLowerCase().includes('suspended')
              ? 'Your account has been suspended. Please contact an administrator.'
              : detail || 'Unable to sign in. Please try again.',
        );
      } else if (loginError instanceof Error) {
        setError(loginError.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    if (error) setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={riseIn(440)} style={styles.logoWrap}>
            <Image
              source={require('@/assets/images/ormoc-driver-mark.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Ormoc City bus logo"
            />
          </Animated.View>

          <Animated.Text entering={riseIn(360)} style={styles.title}>
            Login your Driver Account
          </Animated.Text>

          <Animated.View entering={riseIn(40)} style={styles.card}>
            <Animated.View entering={riseIn(260)}>
              <Text style={styles.fieldLabel}>Username or Phone</Text>
              <View style={[styles.inputWrapper, error && styles.inputError]}>
                <Ionicons name="person-outline" size={17} color={COLORS.ink} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="09xxxxxxxxx"
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    clearError();
                  }}
                  returnKeyType="next"
                  accessibilityLabel="Username or phone"
                />
              </View>
            </Animated.View>

            <Animated.View entering={riseIn(180)} style={styles.passwordGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputWrapper, error && styles.inputError]}>
                <Ionicons name="key-outline" size={17} color={COLORS.ink} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearError();
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Password"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((visible) => !visible)}
                  hitSlop={10}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.ink}
                  />
                </Pressable>
              </View>
            </Animated.View>

            {error ? (
              <Animated.View entering={FadeIn.duration(180)} style={styles.errorBanner} accessibilityRole="alert">
                <Ionicons name="close-outline" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={riseIn(100)}>
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginButton,
                  error && styles.loginButtonAfterError,
                  pressed && styles.loginButtonPressed,
                  loading && styles.loginButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <View style={styles.loginButtonContent}>
                    <Text style={styles.loginButtonText}>Login</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>

            <Animated.View entering={riseIn(0)} style={styles.forgotWrap}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/forgot-password')}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  background: '#D3DFEA',
  white: '#FFFFFF',
  ink: '#111111',
  placeholder: '#73777A',
  border: '#A9ADB0',
  primary: '#00A99D',
  primaryPressed: '#00988E',
  error: '#F04444',
  errorBorder: '#FF8D8D',
  errorBackground: '#FFDADA',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 38,
  },
  logoWrap: {
    width: 108,
    height: 108,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    width: '100%',
    marginTop: 25,
    marginBottom: 46,
    paddingHorizontal: 8,
    color: COLORS.ink,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 29,
    includeFontPadding: false,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'column',
  },
  fieldLabel: {
    marginBottom: 8,
    color: COLORS.ink,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  inputWrapper: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 7,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    marginBottom: 10
  },
  inputError: {
    borderColor: COLORS.errorBorder,
  },
  inputIcon: {
    marginRight: 13,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    color: COLORS.ink,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  passwordGroup: {
    marginTop: 10,
  },
  eyeButton: {
    padding: 3,
  },
  errorBanner: {
    minHeight: 26,
    marginTop: 28,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 3,
    backgroundColor: COLORS.errorBackground,
  },
  errorText: {
    flex: 1,
    marginLeft: 5,
    color: COLORS.error,
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    lineHeight: 14,
  },
  loginButton: {
    minHeight: 48,
    marginTop: 29,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  loginButtonAfterError: {
    marginTop: 11,
  },
  loginButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: COLORS.white,
    fontFamily: 'Poppins_500Medium',
    fontSize: 17,
    lineHeight: 25,
    includeFontPadding: false,
  },
  forgotWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  forgotText: {
    width: '100%',
    color: COLORS.ink,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 22,
    includeFontPadding: false,
    textAlign: 'center',
    marginBottom: 10
  },
});
