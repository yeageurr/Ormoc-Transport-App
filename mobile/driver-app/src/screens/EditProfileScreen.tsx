import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StatusBar, StyleSheet, Text, TextInput, View, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyProfile, resendMyEmailOtp, updateMyProfile, verifyMyEmailOtp, type DriverProfile } from '@/api/profileAPI';
import { getMyDriverVehicle } from '@/api/routesAPI';
import { useAuth } from '@/hooks/useAuth';

export default function EditProfileScreen() {
  const router = useRouter();
  const { refreshUser, signOut } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [phoneReauthPending, setPhoneReauthPending] = useState(false);
  const otpInputs = useRef<Array<TextInput | null>>([]);
  const otpRequestInFlight = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const phoneChanged = profile !== null && contactNumber.trim() !== profile.contact_number;
  const emailChanged = profile !== null && email.trim() !== (profile.email ?? '');
  const verificationRequired = phoneChanged || emailChanged;
  const phoneError = phoneTouched ? validatePhone(contactNumber) : undefined;
  const emailError = emailTouched ? validateEmail(email) : undefined;
  const dirty = profile !== null && (
    firstName !== profile.first_name
    || lastName !== profile.last_name
    || phoneChanged
    || emailChanged
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      getMyProfile(),
      getMyDriverVehicle().catch(() => null),
    ])
      .then(([currentProfile, currentVehicle]) => {
        if (!active) return;
        setProfile(currentProfile);
        setVehiclePlateNumber(currentVehicle?.plate_number ?? currentProfile.vehicle_plate_number ?? null);
        setFirstName(currentProfile.first_name);
        setLastName(currentProfile.last_name);
        setContactNumber(currentProfile.contact_number);
        setEmail(currentProfile.email ?? '');
      })
      .catch(() => Alert.alert('Unable to load profile', 'Check your connection and try again.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const leaveScreen = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Exit Edit Profile?', 'Your unsaved changes will be discarded.', [
      { text: 'Continue editing', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const saveProfile = async () => {
    if (!profile) return;
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Name required', 'Enter both your first and last name.');
      return;
    }
    setPhoneTouched(true);
    setEmailTouched(true);
    if (validatePhone(contactNumber)) {
      Alert.alert('Invalid phone number', validatePhone(contactNumber));
      return;
    }
    if (validateEmail(email)) {
      Alert.alert('Invalid email', validateEmail(email));
      return;
    }
    if (verificationRequired) {
      setVerificationOpen(true);
      return;
    }

    await persistProfile();
  };

  const persistProfile = async (currentPassword?: string) => {
    if (!profile) return;
    const phoneChangedForSave = phoneChanged;
    setSaving(true);
    try {
      const payload: Parameters<typeof updateMyProfile>[0] = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
      };
      if (verificationRequired) {
        if (!currentPassword) {
          setVerificationOpen(true);
          return;
        }
        payload.current_password = currentPassword;
      }
      if (phoneChanged) payload.contact_number = contactNumber.trim();

      const updated = await updateMyProfile(payload);
      await refreshUser().catch(() => undefined);
      setProfile(updated);
      setFirstName(updated.first_name);
      setLastName(updated.last_name);
      setContactNumber(updated.contact_number);
      setEmail(updated.email ?? '');
      setVerificationOpen(false);
      setVerifyPassword('');
      if (updated.email_verification_pending && updated.pending_email) {
        setPendingEmail(updated.pending_email);
        setPhoneReauthPending(phoneChangedForSave);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setTimeout(() => setOtpOpen(true), 180);
        return;
      }
      if (phoneChangedForSave) {
        promptLoginAgain();
        return;
      }
      Alert.alert('Profile updated', 'Your profile changes were saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const responseData = error?.response?.data;
      Alert.alert(
        'Unable to update profile',
        responseData?.detail ?? responseData?.error?.message ?? 'Please check your password and profile details, then try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const promptLoginAgain = () => {
    Alert.alert(
      'Log in again',
      'Your phone number was changed. Log in again with the new number to refresh your account token.',
      [{ text: 'Log in', onPress: () => { void signOut(); } }],
      { cancelable: false },
    );
  };

  const verifyOtp = async (code: string) => {
    if (otpRequestInFlight.current) return;
    otpRequestInFlight.current = true;
    setOtpVerifying(true);
    setOtpError('');
    try {
      const verifiedProfile = await verifyMyEmailOtp(code);
      const refreshedProfile = await getMyProfile().catch(() => verifiedProfile);
      setProfile(refreshedProfile);
      setFirstName(refreshedProfile.first_name);
      setLastName(refreshedProfile.last_name);
      setContactNumber(refreshedProfile.contact_number);
      setEmail(refreshedProfile.email ?? '');
      await refreshUser().catch(() => undefined);
      setOtpOpen(false);
      setOtpDigits(['', '', '', '', '', '']);
      if (phoneReauthPending) {
        promptLoginAgain();
      } else {
        Alert.alert('Email verified', 'Your email address has been updated.');
      }
    } catch (error: any) {
      setOtpError(error?.response?.data?.detail ?? 'Unable to verify this code. Check it and try again.');
      setOtpDigits(['', '', '', '', '', '']);
      requestAnimationFrame(() => otpInputs.current[0]?.focus());
    } finally {
      otpRequestInFlight.current = false;
      setOtpVerifying(false);
    }
  };

  const changeOtpDigit = (index: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, 6);
    const next = [...otpDigits];
    if (digits.length > 1) {
      for (let offset = 0; offset < digits.length && index + offset < 6; offset += 1) {
        next[index + offset] = digits[offset];
      }
    } else {
      next[index] = digits;
    }
    setOtpDigits(next);
    setOtpError('');
    const lastFilled = next.findIndex((digit) => !digit);
    if (lastFilled >= 0) otpInputs.current[lastFilled]?.focus();
    if (lastFilled < 0) void verifyOtp(next.join(''));
  };

  const closeOtpPrompt = () => {
    setOtpOpen(false);
    setOtpDigits(['', '', '', '', '', '']);
    if (phoneReauthPending) {
      promptLoginAgain();
    } else {
      Alert.alert('Email not verified', 'Your previous email address remains on your profile.');
    }
  };

  const resendOtp = async () => {
    setOtpResending(true);
    setOtpError('');
    try {
      await resendMyEmailOtp();
      setOtpDigits(['', '', '', '', '', '']);
      Alert.alert('Code sent', `A new verification code was sent to ${pendingEmail}.`);
      requestAnimationFrame(() => otpInputs.current[0]?.focus());
    } catch (error: any) {
      setOtpError(error?.response?.data?.detail ?? 'Unable to resend the code. Please try again.');
    } finally {
      setOtpResending(false);
    }
  };

  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <StatusBar barStyle="dark-content" backgroundColor="#D3DFEB" />
      <View style={styles.content}>
        <Pressable style={styles.back} onPress={leaveScreen}>
          <Ionicons name="arrow-back-sharp" size={16} color="#101010" />
          <Text style={styles.title}> Edit Profile </Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#179F7E" />
        ) : profile ? (
          <>
            <View style={styles.mainContent}>
              <View style={styles.identity}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials || 'DR'}</Text></View>
                <Text style={styles.driverId}>Driver ID: {profile.driver_id}</Text>
              </View>

              <View style={styles.nameRow}>
                <FormField label="First Name" placeholderText="John" value={firstName} onChangeText={setFirstName} style={styles.half} />
                <FormField label="Last Name" placeholderText="Doe" value={lastName} onChangeText={setLastName} style={styles.half} />
              </View>

              <View style={styles.fields}>
                <FormField
                  label="Phone"
                  placeholderText="09xxxxxxxxx"
                  value={contactNumber}
                  onChangeText={(value) => { setContactNumber(value); setPhoneTouched(true); }}
                  keyboardType="phone-pad"
                  maxLength={11}
                  error={phoneError}
                />
                <Text style={styles.helper}>Used as your login · changing it requires your current password</Text>
              </View>
              <View style={styles.fields}>
                <FormField
                  label="Email"
                  placeholderText="sample@email.com"
                  value={email}
                  onChangeText={(value) => { setEmail(value); setEmailTouched(true); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={254}
                  error={emailError}
                />
              </View>
              <View style={styles.fields}>
                <FormField label="Vehicle Plate No." placeholderText="ABC-1234" value={(vehiclePlateNumber ?? profile?.vehicle_plate_number)?.toUpperCase() ?? 'Currently not assigned'} editable={false} icon="car-outline" />
              </View>
              <View style={styles.fields}>
                <FormField label="License No." placeholderText="A01-23-456789" value={profile.license_num} editable={false} icon="card-outline" />
              </View>


            </View>
          </>
        ) : (
          <View style={styles.loadError}>
            <Text style={styles.errorText}>Your profile could not be loaded.</Text>
            <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Go back</Text></Pressable>
          </View>
        )}

        <View>
          <Pressable disabled={saving || loading || !profile} onPress={() => void saveProfile()} style={[styles.save, (saving || loading || !profile) && styles.saveDisabled]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.saveText}>Update Profile</Text><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></>}
          </Pressable>
        </View>
      </View>
      <Modal
        transparent
        visible={verificationOpen}
        animationType="fade"
        onRequestClose={() => {
          if (!saving) {
            setVerificationOpen(false);
            setVerifyPassword('');
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.verificationCard}>
            <Text style={styles.verificationTitle}>Verify it’s you</Text>
            <Text style={styles.verificationMessage}>
              {phoneChanged && emailChanged
                ? 'Enter your current password to change your phone number and verify your new email.'
                : phoneChanged
                  ? 'Enter your current password to change the phone number used to sign in.'
                  : 'Enter your current password before we send a verification code to your new email.'}
            </Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={verifyPassword}
                onChangeText={setVerifyPassword}
                placeholder="Current password"
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                style={styles.passwordInput}
              />
              <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} onPress={() => setPasswordVisible((visible) => !visible)} hitSlop={8}>
                <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color="#59686D" />
              </Pressable>
            </View>
            <View style={styles.verificationActions}>
              <Pressable disabled={saving} onPress={() => { setVerificationOpen(false); setVerifyPassword(''); }} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={saving || !verifyPassword} onPress={() => void persistProfile(verifyPassword)} style={[styles.verifyButton, (saving || !verifyPassword) && styles.saveDisabled]}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.verifyText}>Verify & Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={otpOpen} animationType="fade" onRequestClose={closeOtpPrompt}>
        <View style={styles.modalBackdrop}>
          <View style={styles.verificationCard}>
            <Text style={styles.verificationTitle}>Verify your email</Text>
            <Text style={styles.verificationMessage}>Enter the 6-digit code sent to {pendingEmail}. Your email will update after the code is verified.</Text>
            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(input) => { otpInputs.current[index] = input; }}
                  value={digit}
                  onChangeText={(value) => changeOtpDigit(index, value)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) otpInputs.current[index - 1]?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                  editable={!otpVerifying}
                  accessibilityLabel={`Verification digit ${index + 1}`}
                  style={styles.otpInput}
                />
              ))}
            </View>
            {otpVerifying ? <ActivityIndicator style={styles.otpSpinner} color="#004C43" /> : null}
            {otpError ? <Text style={styles.fieldError}>{otpError}</Text> : null}
            <Pressable disabled={otpResending || otpVerifying} onPress={() => void resendOtp()} style={styles.resendButton}>
              <Text style={styles.resendText}>{otpResending ? 'Sending…' : 'Resend code'}</Text>
            </Pressable>
            <View style={styles.verificationActions}>
              <Pressable disabled={otpVerifying} onPress={closeOtpPrompt} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

interface FormFieldProps {
  label: string;
  placeholderText: string;
  value: string;
  onChangeText?: (value: string) => void;
  editable?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'email-address' | 'phone-pad';
  autoCapitalize?: 'none';
  maxLength?: number;
  error?: string;
  style?: StyleProp<ViewStyle>;
}

function FormField({ label, value, onChangeText, editable = true, icon, keyboardType, autoCapitalize, maxLength, error, style, placeholderText }: FormFieldProps) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldRow, !editable && styles.readOnlyRow, Boolean(error) && styles.fieldRowError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          placeholder={editable ? `${placeholderText.toLowerCase()}` : undefined}
          placeholderTextColor="#8A9498"
          style={[styles.field, !editable && styles.readOnlyField]}
        />
        {icon ? <Ionicons name={icon} size={14} color="#7A898D" /> : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D3DFEB' },
  content: { flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1, paddingVertical: 20, paddingHorizontal: 15 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: '#101010', fontSize: 19, fontFamily: 'Roboto_500Medium' },
  loader: { marginTop: 55 },

  // Profile Main Content
  mainContent: { flex: 1, padding: 10, gap: 10, },

  identity: { alignItems: 'center', marginTop: 16, marginBottom: 22 },
  avatar: { width: 75, height: 75, alignItems: 'center', justifyContent: 'center', borderRadius: 37, backgroundColor: '#1D9E75' },
  avatarText: { color: '#06493C', fontSize: 18, fontFamily: 'Roboto_600SemiBold', letterSpacing: 1 },
  driverId: { marginTop: 8, color: '#101010', fontSize: 12, fontFamily: 'Roboto_500SemiBOld' },

  fields: { flexDirection: 'column', gap: 4, marginVertical: 4 },
  nameRow: { flexDirection: 'row', gap: 7 },
  fieldWrap: { gap: 4 },
  half: { flex: 1 },
  fieldLabel: { color: '#101010', fontSize: 12, fontFamily: 'Roboto_400Regular' },
  fieldRow: { height: 40, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#B9C5CE', borderRadius: 5, paddingHorizontal: 10, backgroundColor: '#FFFFFF' },
  fieldRowError: { borderColor: '#D98282' },
  readOnlyRow: { borderColor: '#C7D0D7' },
  field: { flex: 1, color: '#303B40', padding: 0, fontSize: 13, fontFamily: 'Poppins_400Regular', alignItems: 'center', justifyContent: 'space-between' },
  readOnlyField: { color: '#778287' },
  helper: { marginTop: 4, color: '#59696F', fontSize: 8, letterSpacing: 0.3 },
  fieldError: { marginTop: 1, color: '#B65C5C', fontSize: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(9, 24, 31, 0.56)' },
  verificationCard: { borderRadius: 12, padding: 20, backgroundColor: '#F8FAFC' },
  verificationTitle: { color: '#25343A', fontSize: 18, fontWeight: '700' },
  verificationMessage: { marginTop: 7, marginBottom: 15, color: '#52636A', fontSize: 12, lineHeight: 18 },
  passwordRow: { height: 44, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#B9C5CE', borderRadius: 6, paddingHorizontal: 11, backgroundColor: '#FFFFFF' },
  passwordInput: { flex: 1, height: '100%', color: '#303B40', padding: 0, fontSize: 13 },
  verificationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 18 },
  cancelButton: { minWidth: 76, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingHorizontal: 10 },
  cancelText: { color: '#42545A', fontSize: 12, fontWeight: '600' },
  verifyButton: { minWidth: 112, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingHorizontal: 12, backgroundColor: '#004C43' },
  verifyText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 7, marginTop: 5 },
  otpInput: { width: 40, height: 48, borderWidth: 1, borderColor: '#B9C5CE', borderRadius: 7, backgroundColor: '#FFFFFF', color: '#25343A', textAlign: 'center', fontSize: 20, fontWeight: '700' },
  otpSpinner: { marginTop: 12 },
  resendButton: { alignSelf: 'center', padding: 8, marginTop: 8 },
  resendText: { color: '#007B6E', fontSize: 12, fontWeight: '700' },
  save: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 'auto', borderRadius: 6, backgroundColor: '#004C43' },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  // Profile Main Content

  loadError: { alignItems: 'center', marginTop: 55, gap: 10 },
  errorText: { color: '#475B60', fontSize: 12 },
  backLink: { color: '#007B6E', fontSize: 12, fontWeight: '700' },

});

function validatePhone(value: string): string | undefined {
  const phone = value.trim();
  if (!/^\d*$/.test(phone)) return 'phone number cannot contain non-numeric characters';
  if (phone.length !== 11) return 'Phone number must be exactly 11 digits';
  return undefined;
}

function validateEmail(value: string): string | undefined {
  const emailAddress = value.trim();
  if (!emailAddress) return undefined;

  const [localPart, domain, ...extraParts] = emailAddress.split('@');
  if (extraParts.length || !localPart || !domain || emailAddress.length > 254 || localPart.length > 64) {
    return 'Enter an email with a valid address and domain.';
  }
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return 'Enter an email with a valid address and domain.';
  }

  const localPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
  const labels = domain.split('.');
  const validLabels = labels.length >= 2 && labels.every((label) =>
    label.length > 0
      && label.length <= 63
      && /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(label),
  );
  const topLevelDomain = labels[labels.length - 1] ?? '';
  const reservedDomains = ['example.com', 'example.net', 'example.org'];
  const isReserved = reservedDomains.includes(domain.toLowerCase())
    || ['.invalid', '.localhost', '.local', '.test', '.example'].some((suffix) => domain.toLowerCase().endsWith(suffix));

  if (!localPattern.test(localPart) || !validLabels || !/^[A-Z]{2,63}$/i.test(topLevelDomain) || isReserved) {
    return 'Enter an email with a valid address and domain.';
  }
  return undefined;
}
