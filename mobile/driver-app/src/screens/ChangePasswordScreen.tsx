import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { changePassword, requestPasswordChangeOtp, verifyPasswordChangeOtp } from '@/api/profileAPI';
import { useAuth } from '@/hooks/useAuth';

const passwordRequirement = 'New password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.';
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { mustChangePassword, completePasswordChange } = useAuth();
  const [step, setStep] = useState<'current' | 'otp' | 'new-password'>('current');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState('');
  const [error, setError] = useState('');
  const [currentTouched, setCurrentTouched] = useState(false);
  const [nextTouched, setNextTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = Boolean(current || next || confirm || otp.some(Boolean));
  const otpInputs = useRef<Array<TextInput | null>>([]);
  const otpVerifyInFlight = useRef(false);
  const passwordsMatch = Boolean(next && confirm && next === confirm);
  const passwordsDiffer = Boolean(next && confirm && next !== confirm);
  const currentError = (currentTouched || validationAttempted) && !current ? 'Enter your current password.' : undefined;
  const nextError = (nextTouched || validationAttempted)
    ? !next ? 'Enter a new password.' : !passwordPattern.test(next) ? passwordRequirement : undefined
    : undefined;
  const confirmError = (confirmTouched || validationAttempted)
    ? !confirm ? 'Confirm your new password.' : next !== confirm ? 'Passwords do not match.' : undefined
    : undefined;

  const returnToProfile = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs/profile' as never);
    }
  };

  const leave = () => {
    if (mustChangePassword) return;
    if (!dirty) {
      returnToProfile();
      return;
    }
    Alert.alert('Exit Change Password?', 'Your unsaved changes will be discarded.', [
      { text: 'Continue editing', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: returnToProfile },
    ]);
  };

  const errorMessage = (reason: any, fallback: string) =>
    reason?.response?.data?.detail ?? reason?.response?.data?.error?.message ?? fallback;

  const sendOtp = async () => {
    if (!current) {
      setCurrentTouched(true);
      setError('Enter your current password first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await requestPasswordChangeOtp(current);
      setOtp(['', '', '', '', '', '']);
      setStep('otp');
      requestAnimationFrame(() => otpInputs.current[0]?.focus());
    } catch (reason) {
      setError(errorMessage(reason, 'Unable to send a verification code. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (otpVerifyInFlight.current) return;
    otpVerifyInFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const token = await verifyPasswordChangeOtp(code);
      setVerificationToken(token);
      setStep('new-password');
      setValidationAttempted(false);
    } catch (reason) {
      setError(errorMessage(reason, 'Unable to verify the code. Check it and try again.'));
      setOtp(['', '', '', '', '', '']);
      requestAnimationFrame(() => otpInputs.current[0]?.focus());
    } finally {
      otpVerifyInFlight.current = false;
      setSaving(false);
    }
  };

  const changeOtpDigit = (index: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, 6);
    const updated = [...otp];
    if (digits.length > 1) {
      for (let offset = 0; offset < digits.length && index + offset < 6; offset += 1) updated[index + offset] = digits[offset];
    } else {
      updated[index] = digits;
    }
    setOtp(updated);
    setError('');
    const firstEmpty = updated.findIndex((digit) => !digit);
    if (firstEmpty >= 0) otpInputs.current[firstEmpty]?.focus();
    else void verifyOtp(updated.join(''));
  };

  const save = async () => {
    setValidationAttempted(true);
    if (!current || !next || !confirm || next !== confirm || !passwordPattern.test(next)) return;
    if (!verificationToken) {
      setError('Verify the SMS code before updating your password.');
      return;
    }

    setSaving(true);
    const isRequiredChange = mustChangePassword;
    try {
      await changePassword(verificationToken, next, confirm);
      completePasswordChange();
      Alert.alert(
        isRequiredChange ? 'Password set' : 'Password changed',
        isRequiredChange ? 'Your account is ready to use.' : 'Your password was updated.',
        [{
          text: 'Continue',
          onPress: () => isRequiredChange ? router.replace('/tabs' as never) : router.back(),
        }],
      );
    } catch (error: any) {
      const responseData = error?.response?.data;
      const detail = responseData?.detail || responseData?.error?.message;
      const validationErrors = responseData?.error?.details;
      const validationMessage = Array.isArray(validationErrors)
        ? validationErrors.map((item: { field?: string; message?: string }) =>
            [item.field, item.message].filter(Boolean).join(': '),
          ).join('\n')
        : null;
      Alert.alert(
        'Unable to update password',
        validationMessage
          || detail
          || responseData?.error?.message
          || 'Please check your current password and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 'new-password') {
      setStep('otp');
      setVerificationToken('');
      setOtp(['', '', '', '', '', '']);
    } else if (step === 'otp') {
      leave();
    } else {
      leave();
    }
  };

  const title = mustChangePassword ? 'Set your password' : 'Change password';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#D3DFEB" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {mustChangePassword && step === 'current' ? <Text style={styles.title}>{title}</Text> : <Pressable style={styles.back} onPress={goBack}>
          <Ionicons name="arrow-back" size={21} color="#26383E" />
          <Text style={styles.title}>{title}</Text>
        </Pressable>}
        <Text style={styles.subtitle}>
          {step === 'current'
            ? mustChangePassword ? 'Verify your temporary password to begin setup.' : 'Verify your identity to change your password.'
            : step === 'otp' ? 'Enter the 6-digit code sent to your registered mobile number.' : 'Choose a secure password for your account.'}
        </Text>

        {step === 'current' ? (
          <>
            <PasswordField label="Current password" value={current} onChangeText={(value) => { setCurrent(value); setCurrentTouched(true); setError(''); }} error={currentError} />
            <Pressable disabled={saving} onPress={() => void sendOtp()} style={[styles.save, saving && styles.saveDisabled]}>
              <Text style={styles.saveText}>{saving ? 'Sending code…' : 'Send SMS code'}</Text>
              {!saving ? <Ionicons name="chatbubble-ellipses-outline" size={19} color="#FFFFFF" /> : null}
            </Pressable>
          </>
        ) : null}

        {step === 'otp' ? (
          <>
            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(input) => { otpInputs.current[index] = input; }}
                  value={digit}
                  onChangeText={(value) => changeOtpDigit(index, value)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) otpInputs.current[index - 1]?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                  editable={!saving}
                  accessibilityLabel={`SMS verification digit ${index + 1}`}
                  style={styles.otpInput}
                />
              ))}
            </View>
            {saving ? <Text style={styles.otpStatus}>Verifying code…</Text> : null}
            <Pressable disabled={saving} onPress={() => void sendOtp()} style={styles.resend}>
              <Text style={styles.resendText}>Resend SMS code</Text>
            </Pressable>
          </>
        ) : null}

        {step === 'new-password' ? (
          <>
            <Text style={styles.requirement}>{passwordRequirement}</Text>
            <PasswordField label="New password" value={next} onChangeText={(value) => { setNext(value); setNextTouched(true); setError(''); }} error={nextError} />
            <PasswordField label="Confirm new password" value={confirm} onChangeText={(value) => { setConfirm(value); setConfirmTouched(true); setError(''); }} error={confirmError} />
            {passwordsMatch ? (
              <View style={styles.matchBanner}>
                <Ionicons name="checkmark-done-outline" size={15} color="#164D2D" />
                <Text style={styles.matchText}>Passwords match</Text>
              </View>
            ) : passwordsDiffer ? (
              <View style={[styles.matchBanner, styles.mismatchBanner]}>
                <Ionicons name="close-outline" size={15} color="#8C3E35" />
                <Text style={[styles.matchText, styles.mismatchText]}>Passwords do not match</Text>
              </View>
            ) : null}
            <Pressable disabled={saving} onPress={() => void save()} style={[styles.save, saving && styles.saveDisabled]}>
              <Text style={styles.saveText}>{saving ? 'Updating…' : 'Update Password'}</Text>
              {!saving ? <Ionicons name="arrow-forward" size={20} color="#FFFFFF" /> : null}
            </Pressable>
          </>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PasswordField({ label, value, onChangeText, error }: { label: string; value: string; onChangeText: (value: string) => void; error?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldRow, Boolean(error) && styles.fieldRowError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.field}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`} onPress={() => setVisible((currentVisible) => !currentVisible)} hitSlop={8}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={17} color="#59686D" />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D3DFEB' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 13, paddingBottom: 15 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: '#25343A', fontSize: 17, fontWeight: '700' },
  subtitle: { maxWidth: 285, marginTop: 6, marginBottom: 26, color: '#394A50', fontSize: 11, lineHeight: 14 },
  requirement: { marginTop: -10, marginBottom: 20, color: '#52636A', fontSize: 11, lineHeight: 14, fontWeight: '500' },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { marginBottom: 5, color: '#33454B', fontSize: 11, letterSpacing: 2, fontWeight: '500' },
  fieldRow: { height: 41, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#B9C5CE', borderRadius: 5, paddingHorizontal: 10, backgroundColor: '#FFFFFF' },
  fieldRowError: { borderColor: '#D98282' },
  field: { flex: 1, height: '100%', color: '#101010', padding: 0, fontSize: 12, fontFamily: 'Poppins_400Regular', letterSpacing: 1 },
  fieldError: { marginTop: 3, color: '#B65C5C', fontSize: 10, lineHeight: 14 },
  matchBanner: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1, borderRadius: 5, paddingHorizontal: 10, backgroundColor: '#B9F69B' },
  matchText: { color: '#164D2D', fontSize: 9, fontWeight: '600' },
  mismatchBanner: { backgroundColor: '#F8D2C8' },
  mismatchText: { color: '#8C3E35' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 7, marginTop: 4, marginBottom: 14 },
  otpInput: { width: 40, height: 48, borderWidth: 1, borderColor: '#B9C5CE', borderRadius: 7, backgroundColor: '#FFFFFF', color: '#25343A', textAlign: 'center', fontSize: 20, fontWeight: '700' },
  otpStatus: { marginBottom: 12, textAlign: 'center', color: '#52636A', fontSize: 11 },
  resend: { alignSelf: 'center', paddingVertical: 10 },
  resendText: { color: '#004C43', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  save: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 'auto', borderRadius: 6, backgroundColor: '#004C43' },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
