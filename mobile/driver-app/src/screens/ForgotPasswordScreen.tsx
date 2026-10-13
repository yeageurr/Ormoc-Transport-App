import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  completePasswordReset,
  requestPasswordResetCode,
  resendPasswordResetCode,
  verifyPasswordResetCode,
} from '@/api/authAPI';

type ResetStep = 'email' | 'code' | 'password';
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeInputs = useRef<Array<TextInput | null>>([]);

  const apiError = (reason: any, fallback: string) =>
    reason?.response?.data?.detail ?? reason?.response?.data?.error?.message ?? fallback;

  const sendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordResetCode(normalizedEmail);
      setEmail(normalizedEmail);
      setCode(['', '', '', '', '', '']);
      setStep('code');
    } catch (reason) {
      setError(apiError(reason, 'Unable to send a reset code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const updateCodeDigit = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '').slice(0, 6);
    const next = [...code];
    if (incoming.length > 1) {
      for (let offset = 0; offset < incoming.length && index + offset < 6; offset += 1) {
        next[index + offset] = incoming[offset];
      }
    } else {
      next[index] = incoming;
    }
    setCode(next);
    setError('');
    const firstEmpty = next.findIndex((digit) => !digit);
    if (firstEmpty >= 0) codeInputs.current[firstEmpty]?.focus();
  };

  const verifyCode = async () => {
    const value = code.join('');
    if (value.length !== 6) {
      setError('Enter all 6 digits from the email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await verifyPasswordResetCode(email, value);
      setResetToken(token);
      setStep('password');
    } catch (reason) {
      setError(apiError(reason, 'Unable to verify that code. Please check it and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError('');
    try {
      await resendPasswordResetCode(email);
      setCode(['', '', '', '', '', '']);
      Alert.alert('Code sent', `A new reset code was sent to ${email}.`);
      requestAnimationFrame(() => codeInputs.current[0]?.focus());
    } catch (reason) {
      setError(apiError(reason, 'Unable to resend the code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const saveNewPassword = async () => {
    if (!PASSWORD_RULE.test(newPassword)) {
      setError('Use at least 8 characters with an uppercase letter, a lowercase letter, and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await completePasswordReset(resetToken, newPassword, confirmPassword);
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        { text: 'Back to login', onPress: () => router.replace('/login') },
      ], { cancelable: false });
    } catch (reason) {
      setError(apiError(reason, 'Unable to update your password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 'password') setStep('code');
    else if (step === 'code') setStep('email');
    else router.back();
  };

  const titles: Record<ResetStep, string> = {
    email: 'Forgot Password?',
    code: 'Verify your email',
    password: 'Create a new password',
  };
  const descriptions: Record<ResetStep, string> = {
    email: 'Enter the email address linked to your driver account.',
    code: `Enter the 6-digit code sent to ${email}.`,
    password: 'Choose a new password for your driver account.',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={styles.header}>
          <Text style={styles.title}>{titles[step]}</Text>
          <View style={styles.underline} />
          <Text style={styles.description}>{descriptions[step]}</Text>
        </View>

        <View style={styles.card}>
          {step === 'email' ? (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#8FD9D3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor="#7FA8A4"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={() => void sendCode()}
                />
              </View>

              <View style={styles.actionPane}>
                <ActionButton title="Send code" loading={loading} onPress={() => void sendCode()} />
                <Pressable style={styles.cancelButton} onPress={goBack} >
                  <Ionicons name={'arrow-back-sharp'} size={16} color={'#ffffff'} ></Ionicons>
                  <Text style={styles.backText}>Cancel</Text>
                </Pressable>
              </View>
              
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <View style={styles.codeRow}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(input) => { codeInputs.current[index] = input; }}
                    value={digit}
                    onChangeText={(value) => updateCodeDigit(index, value)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !code[index] && index > 0) codeInputs.current[index - 1]?.focus();
                    }}
                    style={styles.codeInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    selectTextOnFocus
                    editable={!loading}
                    accessibilityLabel={`Code digit ${index + 1}`}
                  />
                ))}
              </View>
              <ActionButton title="Verify code" loading={loading} onPress={() => void verifyCode()} />
              <Pressable disabled={loading} onPress={() => void resendCode()} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Resend code</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'password' ? (
            <>
              <PasswordField label="New password" value={newPassword} onChangeText={setNewPassword} visible={passwordVisible} toggle={() => setPasswordVisible((value) => !value)} editable={!loading} />
              <PasswordField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} visible={confirmVisible} toggle={() => setConfirmVisible((value) => !value)} editable={!loading} />
              <Text style={styles.passwordHint}>At least 8 characters, including uppercase, lowercase, and a number.</Text>
              {confirmPassword ? (
                <Text style={[styles.matchText, newPassword === confirmPassword ? styles.matchSuccess : styles.matchError]}>
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              ) : null}
              <ActionButton title="Update password" loading={loading} onPress={() => void saveNewPassword()} />
            </>
          ) : null}

          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionButton({ title, loading, onPress }: { title: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={[styles.actionButton, loading && styles.disabledButton]}>
      {loading ? <ActivityIndicator color="#042F2E" /> : <Text style={styles.actionText}>{title}</Text>}
    </Pressable>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  toggle,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  toggle: () => void;
  editable: boolean;
}) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name="key-outline" size={19} color="#8FD9D3" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#7FA8A4"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
      />
      <Pressable onPress={toggle} hitSlop={8}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8FD9D3" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#042F2E' },
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  backButton: { position: 'absolute', top: 18, left: 24, zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6 },
  backText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  header: { alignItems: 'center', marginBottom: 26 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', textAlign: 'center' },
  underline: { width: 54, height: 3, marginTop: 9, borderRadius: 2, backgroundColor: '#2DD4BF' },
  description: { marginTop: 13, color: '#B7D6D2', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  card: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.06)' },
  inputWrapper: { height: 52, flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 15, padding: 0 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 19 },
  codeInput: { width: 40, height: 48, borderWidth: 1, borderColor: 'rgba(143,217,211,0.45)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF', textAlign: 'center', fontSize: 20, fontWeight: '700' },
  
  actionPane: {flexDirection: 'column', gap: 6},
  actionButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#2DD4BF' },
  cancelButton: { minHeight: 35, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  disabledButton: { opacity: 0.65 },
  actionText: { color: '#042F2E', fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignSelf: 'center', padding: 12, marginTop: 3 },
  secondaryText: { color: '#8FD9D3', fontSize: 13, fontWeight: '600' },
  passwordHint: { color: '#A8C6C2', fontSize: 11, lineHeight: 17, marginTop: -5, marginBottom: 10 },
  matchText: { fontSize: 12, marginBottom: 10 },
  matchSuccess: { color: '#86EFAC' },
  matchError: { color: '#FCA5A5' },
  errorText: { color: '#FCA5A5', fontSize: 12, lineHeight: 17, marginTop: 12 },
});
