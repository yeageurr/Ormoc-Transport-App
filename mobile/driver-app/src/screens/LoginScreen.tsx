import React, { useState } from 'react';
import axios from 'axios';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginDriver } from '../api/authAPI';
import { useAuth } from '@/hooks/useAuth'; 

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleLogin = async (): Promise<void> => {
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await loginDriver(username.trim(), password);
      signIn(response.user.first_name);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.error?.message || error.response?.data?.detail;
        setError(
          error.response?.status === 401
            ? 'Invalid username or password.'
            : error.response?.status === 403 && detail?.toLowerCase().includes('suspended')
              ? 'Your account has been suspended. Please contact the terminal administrator.'
            : detail || 'Unable to sign in. Please try again.'
        );
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Watermark seal, low opacity, sits behind everything */}
      <Image
        source={require('../../assets/expo.icon/Assets/grid.png')}
        style={styles.watermark}
        resizeMode="contain"
      />

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Login</Text>
        <View style={styles.titleUnderline} />
        <Text style={styles.subtitle}>ART Fusion Driver</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#8FD9D3" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#7FA8A4"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={20} color="#8FD9D3" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#7FA8A4"
            secureTextEntry={!showPassword}
            autoCapitalize='none'
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#8FD9D3"
            />
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={() => {}}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.forgotWrapper}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
            loading && styles.loginButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#042F2E" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#042F2E',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  watermark: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    height: '40%',
    opacity: 0.06,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2DD4BF',
    marginTop: 8,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 13,
    color: '#8FD9D3',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    marginBottom: 8,
    marginTop: -6,
  },
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginBottom: 22,
  },
  forgotText: {
    color: '#8FD9D3',
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: '#2DD4BF',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonPressed: {
    backgroundColor: '#26B8A5',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#042F2E',
    fontSize: 17,
    fontWeight: '700',
  },
});
