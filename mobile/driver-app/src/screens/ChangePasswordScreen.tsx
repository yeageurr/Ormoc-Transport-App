import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { changePassword } from '@/api/profileAPI';

const passwordRequirement = 'New password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.';
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentTouched, setCurrentTouched] = useState(false);
  const [nextTouched, setNextTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = Boolean(current || next || confirm);
  const passwordsMatch = Boolean(next && confirm && next === confirm);
  const passwordsDiffer = Boolean(next && confirm && next !== confirm);
  const currentError = (currentTouched || validationAttempted) && !current ? 'Enter your current password.' : undefined;
  const nextError = (nextTouched || validationAttempted)
    ? !next ? 'Enter a new password.' : !passwordPattern.test(next) ? passwordRequirement : undefined
    : undefined;
  const confirmError = (confirmTouched || validationAttempted)
    ? !confirm ? 'Confirm your new password.' : next !== confirm ? 'Passwords do not match.' : undefined
    : undefined;

  const leave = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Exit Change Password?', 'Your unsaved changes will be discarded.', [
      { text: 'Continue editing', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = async () => {
    setValidationAttempted(true);
    if (!current || !next || !confirm || next !== confirm || !passwordPattern.test(next)) return;

    setSaving(true);
    try {
      await changePassword(current, next, confirm);
      Alert.alert('Password updated', 'Please sign in again with your new password.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const responseData = error?.response?.data;
      const validationErrors = responseData?.error?.details;
      const validationMessage = Array.isArray(validationErrors)
        ? validationErrors.map((item: { field?: string; message?: string }) =>
            [item.field, item.message].filter(Boolean).join(': '),
          ).join('\n')
        : null;
      Alert.alert(
        'Unable to update password',
        validationMessage
          || responseData?.detail
          || responseData?.error?.message
          || 'Please check your current password and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#D3DFEB" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={leave}>
          <Ionicons name="arrow-back" size={21} color="#26383E" />
          <Text style={styles.title}>Change Password</Text>
        </Pressable>
        <Text style={styles.subtitle}>For your security, choose a password you haven’t used before.</Text>
        <Text style={styles.requirement}>{passwordRequirement}</Text>

        <PasswordField label="Current password" value={current} onChangeText={(value) => { setCurrent(value); setCurrentTouched(true); }} error={currentError} />
        <PasswordField label="New password" value={next} onChangeText={(value) => { setNext(value); setNextTouched(true); }} error={nextError} />
        <PasswordField label="Confirm new password" value={confirm} onChangeText={(value) => { setConfirm(value); setConfirmTouched(true); }} error={confirmError} />

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
  save: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 'auto', borderRadius: 6, backgroundColor: '#004C43' },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
