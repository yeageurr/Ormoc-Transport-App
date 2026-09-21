import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getCurrentDispatch, type CurrentDispatch } from '@/api/dispatchAPI';
import { NotificationBell } from '@/components/NotificationCenter';
import { getMyProfile, type DriverProfile } from '@/api/profileAPI';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [dispatch, setDispatch] = useState<CurrentDispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    const [profileResult, dispatchResult] = await Promise.all([
      getMyProfile().catch(() => null),
      getCurrentDispatch().catch(() => null),
    ]);

    setProfile(profileResult);
    setDispatch(dispatchResult);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : 'Driver';
  const initials = fullName
    .split(' ')
    .map((namePart) => namePart[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>My Profile</Text>
          <NotificationBell />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#20D7C5" />
        ) : (
          <>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View>
                <Text style={styles.name}>{fullName}</Text>
                <Text style={styles.id}>
                  Driver ID: {profile?.driver_id ?? '--'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>My Information</Text>
            <View style={styles.infoCard}>
              <ProfileInfoRow icon="call-outline" value={profile?.contact_number ?? '--'} label="Phone number" />
              <ProfileInfoRow icon="mail-outline" value={profile?.email ?? '--'} label="Email" />
              <ProfileInfoRow icon="git-compare-outline" value={dispatch?.route_label ?? 'Currently not assigned'} label="Route" />
              <ProfileInfoRow icon="car-sport-outline" value={dispatch?.vehicle_plate ?? 'Currently not assigned'} label="Vehicle" />
              <ProfileInfoRow icon="card-outline" value={profile?.license_num ?? '--'} label="License number" last />
            </View>

            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.accountCard}>
              <AccountAction icon="lock-closed-outline" label="Change password" onPress={() => router.push('/change-password' as never)} />
              <AccountAction icon="person-outline" label="Edit profile" onPress={() => router.push('/edit-profile' as never)} last />
            </View>

            <Pressable onPress={() => setLogoutOpen(true)} style={styles.logout}>
              <Ionicons name="log-out-outline" size={21} color="#FFB27B" />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <LogoutModal visible={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => void signOut()} />
    </SafeAreaView>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

interface ProfileInfoRowProps {
  icon: IconName;
  value: string;
  label: string;
  last?: boolean;
}

function ProfileInfoRow({ icon, value, label, last = false }: ProfileInfoRowProps) {
  return (
    <View style={[styles.info, !last && styles.line]}>
      <Ionicons name={icon} size={20} color="#26BEAD" />
      <View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

interface AccountActionProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  last?: boolean;
}

function AccountAction({ icon, label, onPress, last = false }: AccountActionProps) {
  return (
    <Pressable onPress={onPress} style={[styles.account, !last && styles.line]}>
      <Ionicons name={icon} size={20} color="#26BEAD" />
      <Text style={styles.accountText}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#D6EFEB" />
    </Pressable>
  );
}

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function LogoutModal({ visible, onClose, onConfirm }: LogoutModalProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Ionicons name="log-out-outline" size={29} color="#FFB27B" />
          <Text style={styles.sheetTitle}>Log out?</Text>
          <Text style={styles.sheetText}>Are you sure you want to log out of your driver account?</Text>

          <Pressable onPress={onConfirm} style={styles.confirm}>
            <Text style={styles.confirmText}>Log out</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#003F3A' },
  content: { padding: 25, paddingTop: 13, paddingBottom: 28 },
  title: { color: '#FFF', fontSize: 21, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loader: { marginTop: 70 },
  identity: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 39, marginBottom: 27,
  },
  avatar: {
    width: 39, height: 39, borderRadius: 20, backgroundColor: '#22AC8D', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#003F3A', fontSize: 12, fontWeight: '800' },
  name: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  id: { color: '#B3D6D1', fontSize: 9, marginTop: 2 },
  sectionTitle: { color: '#D7F5F0', fontSize: 12, marginBottom: 9 },
  infoCard: { backgroundColor: '#075D54', borderRadius: 13, overflow: 'hidden', marginBottom: 19 },
  info: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13,
  },
  line: { borderBottomWidth: 1, borderBottomColor: '#19756C' },
  value: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  label: { color: '#A1C8C2', fontSize: 8, marginTop: 2 },
  accountCard: { backgroundColor: '#075D54', borderRadius: 13, overflow: 'hidden' },
  account: {
    height: 51, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13,
  },
  accountText: { color: '#FFF', fontSize: 13, fontWeight: '600', flex: 1 },
  logout: {
    height: 42, borderColor: '#F07E27', borderWidth: 1, borderRadius: 9, marginTop: 31,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7,
  },
  logoutText: { color: '#FFC095', fontSize: 14, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' },
  sheet: {
    padding: 22, backgroundColor: '#061C35', borderTopLeftRadius: 25, borderTopRightRadius: 25,
    alignItems: 'center',
  },
  handle: { width: 80, height: 5, backgroundColor: '#8092A2', borderRadius: 3, marginBottom: 21 },
  sheetTitle: { color: '#FFF', fontSize: 21, fontWeight: '700', marginTop: 8 },
  sheetText: { color: '#BFD0DF', fontSize: 12, textAlign: 'center', marginTop: 7 },
  confirm: {
    backgroundColor: '#D66A4B', height: 46, borderRadius: 8, alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', marginTop: 22,
  },
  confirmText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  cancel: { height: 44, justifyContent: 'center' },
  cancelText: { color: '#BCE6E1', fontWeight: '700' },
});
