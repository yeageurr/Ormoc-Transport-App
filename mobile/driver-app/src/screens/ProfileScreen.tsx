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
      <StatusBar barStyle="light-content" backgroundColor="#075E56" />

      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <NotificationBell />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color="#009E91" />
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
  screen: { flex: 1, backgroundColor: '#DCE6F0' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, backgroundColor: '#075E56' },
  content: { paddingHorizontal: 17, paddingTop: 14, paddingBottom: 20 },
  title: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  loader: { marginTop: 70 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 17, marginBottom: 14, paddingHorizontal: 9 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#21A681', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#06463F', fontSize: 12, fontWeight: '800' },
  name: { color: '#26383E', fontSize: 17, fontWeight: '700' },
  id: { color: '#65777E', fontSize: 9, marginTop: 2, fontWeight: '600' },
  sectionTitle: { color: '#36484E', fontSize: 11, fontWeight: '700', marginBottom: 6, marginLeft: 2 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden', marginBottom: 13 },
  info: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 7 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D5DEE4' },
  value: { color: '#3C4A50', fontSize: 11, fontWeight: '600' },
  label: { color: '#7A898F', fontSize: 8, marginTop: 1 },
  accountCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 7, gap: 5 },
  account: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 5, backgroundColor: '#075E56' },
  accountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', flex: 1 },
  logout: { height: 40, borderRadius: 6, marginTop: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, backgroundColor: '#D7E1E9' },
  logoutText: { color: '#46565D', fontSize: 12, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { padding: 22, paddingBottom: 30, backgroundColor: '#F5F8F9', borderTopLeftRadius: 22, borderTopRightRadius: 22, alignItems: 'center' },
  handle: { width: 45, height: 4, backgroundColor: '#B6C5C9', borderRadius: 3, marginBottom: 18 },
  sheetTitle: { color: '#2F454A', fontSize: 19, fontWeight: '700', marginTop: 8 },
  sheetText: { color: '#6A7C81', fontSize: 12, textAlign: 'center', marginTop: 7 },
  confirm: { backgroundColor: '#C95D45', height: 44, borderRadius: 7, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  confirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  cancel: { height: 43, justifyContent: 'center' },
  cancelText: { color: '#087C73', fontWeight: '700' },
});
