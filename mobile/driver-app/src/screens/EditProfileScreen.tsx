import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  getMyProfile,
  updateMyProfile,
  type DriverProfile,
} from '@/api/profileAPI';

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const originalName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : '';
  const dirty = profile !== null && (
    name !== originalName || email !== (profile.email ?? '')
  );

  useEffect(() => {
    void getMyProfile().then((currentProfile) => {
      setProfile(currentProfile);
      setName(`${currentProfile.first_name} ${currentProfile.last_name}`);
      setEmail(currentProfile.email ?? '');
    });
  }, []);

  const leaveScreen = () => {
    if (!dirty) {
      router.back();
      return;
    }

    Alert.alert('Exit Edit Profile?', 'All changes will be deleted.', [
      { text: 'Continue editing', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const saveProfile = async () => {
    if (!profile) {
      return;
    }

    const [firstName, ...lastNameParts] = name.trim().split(/\s+/);
    if (!firstName || lastNameParts.length === 0) {
      Alert.alert('Enter your full name.');
      return;
    }

    setSaving(true);
    try {
      await updateMyProfile({
        first_name: firstName,
        last_name: lastNameParts.join(' '),
        email: email || null,
      });
      Alert.alert('Profile updated', 'Your profile changes were saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    .split(' ')
    .map((namePart) => namePart[0])
    .join('')
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.back} onPress={leaveScreen}>
          <Ionicons name="arrow-back" size={21} color="#E9FFFB" />
          <Text style={styles.title}>Edit Profile</Text>
        </Pressable>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.id}>Driver ID: {profile?.driver_id ?? '--'}</Text>

        <ProfileField label="Full name" value={name} onChangeText={setName} />
        <ProfileField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <ProfileField label="Phone number" value={profile?.contact_number ?? '--'} editable={false} />
        <Text style={styles.help}>
          Phone number is used as your login; contact your admin to change it.
        </Text>
        <ProfileField label="License number" value={profile?.license_num ?? '--'} editable={false} />

        <Pressable disabled={saving} onPress={() => void saveProfile()} style={styles.save}>
          <Text style={styles.saveText}>{saving ? 'Updating…' : 'Update Profile'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  keyboardType?: 'email-address';
}

function ProfileField({ label, ...inputProps }: ProfileFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.field, inputProps.editable === false && styles.disabled]}
        placeholderTextColor="#709B96"
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#002B28' },
  content: { flexGrow: 1, padding: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#21AA8A',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 14,
  },
  avatarText: { color: '#003A35', fontWeight: '800' },
  id: { textAlign: 'center', color: '#94BBB6', fontSize: 9, marginTop: 8, marginBottom: 18 },
  fieldWrap: { marginBottom: 10 },
  fieldLabel: { color: '#71C9BF', fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  field: {
    height: 36,
    borderRadius: 8,
    borderColor: '#257C74',
    borderWidth: 1,
    backgroundColor: '#124C48',
    color: '#FFF',
    paddingHorizontal: 10,
    fontSize: 12,
  },
  disabled: { opacity: 0.65 },
  help: { color: '#76A6A0', fontSize: 8, marginTop: -7, marginBottom: 10 },
  save: {
    height: 45,
    borderRadius: 7,
    backgroundColor: '#1CAB8B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  saveText: { color: '#002D2A', fontWeight: '800' },
});
