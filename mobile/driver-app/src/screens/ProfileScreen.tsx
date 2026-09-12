import { Ionicons } from '@expo/vector-icons';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfileScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Profile</Text>

        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>AD</Text></View>
          <View>
            <Text style={styles.name}>Anthony Domasig</Text>
            <Text style={styles.driverId}>Driver ID: 123-2212-121</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>My Information</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="calendar-outline" value="September 19, 2006 (19 yrs. old)" label="Birthday" />
          <InfoRow icon="git-compare-outline" value="Valencia - Ormoc" label="Route" />
          <InfoRow icon="car-sport-outline" value="Multicab - ABC 123" label="Vehicle" />
          <InfoRow icon="people-outline" value="SAVAMTCO" label="Cooperative" last />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountCard}>
          <AccountRow icon="lock-closed-outline" label="Change password" />
          <AccountRow icon="person-outline" label="Edit profile" last />
        </View>

        <Pressable onPress={signOut} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={23} color="#FFB08C" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, value, label, last = false }: { icon: IconName; value: string; label: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={23} color="#27B9AD" />
      <View style={styles.rowCopy}><Text style={styles.infoValue}>{value}</Text><Text style={styles.infoLabel}>{label}</Text></View>
    </View>
  );
}

function AccountRow({ icon, label, last = false }: { icon: IconName; label: string; last?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.accountRow, !last && styles.rowBorder, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color="#27B9AD" />
      <Text style={styles.accountLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={21} color="#D5F1ED" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#042F2E' },
  content: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 36 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 40, marginBottom: 27 },
  avatar: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#20AE94' },
  avatarText: { color: '#042F2E', fontSize: 13, fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  driverId: { color: '#C4DFDB', fontSize: 10, marginTop: 3 },
  sectionTitle: { color: '#D5F1ED', fontSize: 14, marginBottom: 10 },
  infoCard: { borderRadius: 14, backgroundColor: '#07594F', overflow: 'hidden' },
  infoRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 17 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(169, 209, 204, 0.16)' },
  rowCopy: { flex: 1 },
  infoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  infoLabel: { color: '#A9D1CC', fontSize: 9, marginTop: 2 },
  accountCard: { borderRadius: 14, backgroundColor: '#07594F', overflow: 'hidden' },
  accountRow: { height: 51, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14 },
  accountLabel: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  logoutButton: { height: 47, marginTop: 30, borderRadius: 10, borderWidth: 1, borderColor: '#E8763E', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  logoutText: { color: '#FFB08C', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.65 },
});
