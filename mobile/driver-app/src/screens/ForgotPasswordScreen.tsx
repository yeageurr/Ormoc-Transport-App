import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  completePasswordReset,
  requestPasswordResetCode,
  resendPasswordResetCode,
  verifyPasswordResetCode,
} from '@/api/authAPI';

type ResetStep = 'contact' | 'code' | 'password';
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>('contact');
  const [contact, setContact] = useState('');
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
    const normalizedContact = contact.trim();
    const phoneDigits = normalizedContact.replace(/\D/g, '');
    const validEmail = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(normalizedContact);
    const validPhone = (phoneDigits.length === 11 && phoneDigits.startsWith('09'))
      || (phoneDigits.length === 12 && phoneDigits.startsWith('63'))
      || (phoneDigits.length === 10 && phoneDigits.startsWith('9'));
    if (!normalizedContact || (normalizedContact.includes('@') ? !validEmail : !validPhone)) {
      setError('Enter a valid email address or Philippine mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordResetCode(normalizedContact);
      setContact(normalizedContact);
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
      setError('Enter all 6 digits from the message.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await verifyPasswordResetCode(contact, value);
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
      await resendPasswordResetCode(contact);
      setCode(['', '', '', '', '', '']);
      Alert.alert('Code sent', `A new reset code was sent to ${contact}.`);
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
    else if (step === 'code') setStep('contact');
    else router.back();
  };

  const titles: Record<ResetStep, string> = {
    contact: 'Forgot your password?',
    code: 'Verify your contact',
    password: 'Create a new password',
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
          <Image
            source={require('@/assets/images/ormoc-driver-mark.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Ormoc City bus logo"
          />

          <Text style={styles.title}>{titles[step]}</Text>

          <View style={styles.card}>
            {step === 'contact' ? (
              <>
                <Text style={styles.fieldLabel}>Email or mobile number</Text>
                <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
                  <Ionicons name={contact.includes('@') ? 'mail-outline' : 'phone-portrait-outline'} size={18} color={COLORS.ink} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={contact}
                    onChangeText={(value) => {
                      setContact(value);
                      setError('');
                    }}
                    placeholder="Enter email or 09XXXXXXXXX"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="send"
                    onSubmitEditing={() => void sendCode()}
                    accessibilityLabel="Email address or mobile number"
                  />
                </View>
                <ActionButton title="Send OTP" loading={loading} onPress={() => void sendCode()} />
                <Pressable style={styles.cancelButton} onPress={goBack} disabled={loading}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </>
            ) : null}

            {step === 'code' ? (
              <>
                <Text style={styles.stepDescription}>Enter the 6-digit OTP sent to {contact}</Text>
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
                      style={[styles.codeInput, error ? styles.codeInputError : null]}
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                      editable={!loading}
                      accessibilityLabel={`OTP digit ${index + 1}`}
                    />
                  ))}
                </View>
                <ActionButton title="Verify OTP" loading={loading} onPress={() => void verifyCode()} />
                <Pressable disabled={loading} onPress={() => void resendCode()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Resend OTP</Text>
                </Pressable>
                <BackButton onPress={goBack} />
              </>
            ) : null}

            {step === 'password' ? (
              <>
                <Text style={styles.stepDescription}>Choose a new password for your driver account.</Text>
                <PasswordField label="New password" value={newPassword} onChangeText={(value) => { setNewPassword(value); setError(''); }} visible={passwordVisible} toggle={() => setPasswordVisible((value) => !value)} editable={!loading} />
                <PasswordField label="Confirm new password" value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(''); }} visible={confirmVisible} toggle={() => setConfirmVisible((value) => !value)} editable={!loading} />
                <Text style={styles.passwordHint}>At least 8 characters, including uppercase, lowercase, and a number.</Text>
                {confirmPassword ? (
                  <Text style={[styles.matchText, newPassword === confirmPassword ? styles.matchSuccess : styles.matchError]}>
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                ) : null}
                <ActionButton title="Update password" loading={loading} onPress={() => void saveNewPassword()} />
                <BackButton onPress={goBack} />
              </>
            ) : null}

            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionButton({ title, loading, onPress }: { title: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && !loading ? styles.actionButtonPressed : null, loading ? styles.disabledButton : null]}
    >
      {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>{title}</Text>}
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.backButton}>
      <Ionicons name="arrow-back" size={18} color={COLORS.ink} />
      <Text style={styles.backText}>Go back</Text>
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
    <View style={styles.passwordGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="key-outline" size={18} color={COLORS.ink} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <Pressable onPress={toggle} hitSlop={8} accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={COLORS.ink} />
        </Pressable>
      </View>
    </View>
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
  error: '#D94040',
  errorBorder: '#E77A7A',
  errorBackground: '#FFF0F0',
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingBottom: 28 },
  logo: { width: 104, height: 104, marginBottom: 25 },
  title: { color: COLORS.ink, fontFamily: 'Poppins_600SemiBold', fontSize: 17, lineHeight: 25, textAlign: 'center', marginBottom: 50 },
  card: { width: '100%', backgroundColor: COLORS.white, borderRadius: 9, paddingHorizontal: 15, paddingTop: 24, paddingBottom: 24 },
  fieldLabel: { color: COLORS.ink, fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 16, marginBottom: 8 },
  inputWrapper: { height: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 7, paddingHorizontal: 12, marginBottom: 10 },
  inputError: { borderColor: COLORS.errorBorder },
  inputIcon: { marginRight: 13 },
  input: { flex: 1, height: '100%', padding: 0, color: COLORS.ink, fontFamily: 'Poppins_400Regular', fontSize: 12 },
  actionButton: { height: 43, marginTop: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: COLORS.primary },
  actionButtonPressed: { backgroundColor: COLORS.primaryPressed },
  actionText: { color: COLORS.white, fontFamily: 'Poppins_500Medium', fontSize: 17 },
  disabledButton: { opacity: 0.65 },
  cancelButton: { height: 42, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 5, backgroundColor: COLORS.white },
  cancelText: { color: COLORS.ink, fontFamily: 'Poppins_400Regular', fontSize: 15 },
  stepDescription: { color: COLORS.ink, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 19, textAlign: 'center', marginBottom: 25 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 7, marginBottom: 5 },
  codeInput: { flex: 1, maxWidth: 48, height: 64, borderWidth: 1, borderColor: '#118F87', borderRadius: 10, backgroundColor: '#D9FBF8', color: COLORS.ink, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 22 },
  codeInputError: { borderColor: COLORS.errorBorder },
  secondaryButton: { alignSelf: 'center', padding: 11, marginTop: 3 },
  secondaryText: { color: COLORS.ink, fontFamily: 'Poppins_500Medium', fontSize: 13 },
  backButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8, marginTop: 8 },
  backText: { color: COLORS.ink, fontFamily: 'Poppins_500Medium', fontSize: 14 },
  passwordGroup: { marginBottom: 12 },
  passwordHint: { color: COLORS.placeholder, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 16, marginTop: 1, marginBottom: 8 },
  matchText: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginBottom: 8 },
  matchSuccess: { color: '#15803D' },
  matchError: { color: COLORS.error },
  errorText: { color: COLORS.error, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: 'center' },
});
