import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { getMyProfile, updateMyProfile, type DriverProfile } from '@/api/profileAPI';

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [dispatch, setDispatch] = useState<CurrentDispatch | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dirty = profile !== null && (
    firstName !== profile.first_name
    || lastName !== profile.last_name
    || email !== (profile.email ?? '')
  );

  useEffect(() => {
    let active = true;
    void Promise.all([getMyProfile(), getCurrentDispatch().catch(() => null)])
      .then(([currentProfile, currentDispatch]) => {
        if (!active) return;
        setProfile(currentProfile);
        setFirstName(currentProfile.first_name);
        setLastName(currentProfile.last_name);
        setEmail(currentProfile.email ?? '');
        setDispatch(currentDispatch);
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

    setSaving(true);
    try {
      const updated = await updateMyProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
      });
      setProfile(updated);
      Alert.alert('Profile updated', 'Your profile changes were saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Unable to update profile', error?.response?.data?.detail ?? 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#D3DFEB" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={leaveScreen}>
          <Ionicons name="arrow-back" size={21} color="#26383E" />
          <Text style={styles.title}>Edit Profile</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#179F7E" />
        ) : profile ? (
          <>
            <View style={styles.identity}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials || 'DR'}</Text></View>
              <Text style={styles.driverId}>Driver ID: {profile.driver_id}</Text>
            </View>

            <View style={styles.nameRow}>
              <FormField label="First Name" value={firstName} onChangeText={setFirstName} />
              <FormField label="Last Name" value={lastName} onChangeText={setLastName} />
            </View>

            <FormField label="Phone number" value={profile.contact_number} editable={false} icon="lock-closed-outline" />
            <Text style={styles.helper}>Used as your login · contact your admin to change</Text>
            <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Vehicle" value={dispatch?.vehicle_plate ?? 'Currently not assigned'} editable={false} icon="car-outline" />
            <FormField label="License number" value={profile.license_num} editable={false} icon="card-outline" />
          </>
        ) : (
          <View style={styles.loadError}>
            <Text style={styles.errorText}>Your profile could not be loaded.</Text>
            <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Go back</Text></Pressable>
          </View>
        )}

        <Pressable disabled={saving || loading || !profile} onPress={() => void saveProfile()} style={[styles.save, (saving || loading || !profile) && styles.saveDisabled]}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.saveText}>Update Profile</Text><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  editable?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'email-address';
  autoCapitalize?: 'none';
}

function FormField({ label, value, onChangeText, editable = true, icon, keyboardType, autoCapitalize }: FormFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldRow, !editable && styles.readOnlyRow]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder={editable ? `Enter ${label.toLowerCase()}` : undefined}
          placeholderTextColor="#8A9498"
          style={[styles.field, !editable && styles.readOnlyField]}
        />
        {icon ? <Ionicons name={icon} size={14} color="#7A898D" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D3DFEB' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 13, paddingBottom: 15 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: '#25343A', fontSize: 17, fontWeight: '700' },
  loader: { marginTop: 55 },
  identity: { alignItems: 'center', marginTop: 16, marginBottom: 22 },
  avatar: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center', borderRadius: 37, backgroundColor: '#1BA17D' },
  avatarText: { color: '#06493C', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  driverId: { marginTop: 8, color: '#34454B', fontSize: 10, fontWeight: '600' },
  nameRow: { flexDirection: 'row', gap: 7 },
  fieldWrap: { flex: 1, marginBottom: 13 },
  fieldLabel: { color: '#39494F', fontSize: 9, marginBottom: 5 },
  fieldRow: { height: 41, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#B9C5CE', borderRadius: 5, paddingHorizontal: 10, backgroundColor: '#FFFFFF' },
  readOnlyRow: { borderColor: '#C7D0D7' },
  field: { flex: 1, height: '100%', color: '#303B40', padding: 0, fontSize: 11, fontWeight: '600' },
  readOnlyField: { color: '#778287' },
  helper: { marginTop: -9, marginBottom: 13, color: '#59696F', fontSize: 8, letterSpacing: 0.3 },
  save: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 'auto', borderRadius: 6, backgroundColor: '#004C43' },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  loadError: { alignItems: 'center', marginTop: 55, gap: 10 },
  errorText: { color: '#475B60', fontSize: 12 },
  backLink: { color: '#007B6E', fontSize: 12, fontWeight: '700' },
});
