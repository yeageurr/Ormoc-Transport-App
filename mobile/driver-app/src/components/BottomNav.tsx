import { Ionicons } from '@expo/vector-icons';
import { Href, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

const navItems: NavItem[] = [
  { label: 'Home', icon: 'home-outline', href: '/tabs' },
  { label: 'Trip Logs', icon: 'reader-outline', href: '/tabs/trip-logs' },
  // Start Trip is a prominent action on the v2 Home screen.
  // { label: 'Start Trip', icon: 'navigate', href: '/tabs/record-trip' },
  // { label: 'Reports', icon: 'list-outline', href: '/tabs/report-incident' },
  { label: 'Me', icon: 'person-outline', href: '/tabs/profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.nav}>
      <View style={styles.navButtons}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/tabs' && pathname === '/tabs/');
          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => router.navigate(item.href)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <Ionicons name={item.icon} size={23} color={isActive ? '#2DE0D2' : '#A9C7C4'} />
              <Text style={[styles.label, isActive && styles.activeLabel]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.grabber}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    experimental_backgroundImage: 'linear-gradient(to bottom, #045750 0%, #067D73 100%)',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    height: 70,
    paddingTop: 8,
    paddingBottom: 5,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden'
  },
  navButtons: {
    flexDirection: 'row',
    width: 300
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    color: '#A9C7C4',
    fontSize: 10,
    fontFamily: 'Poppins_600Medium'
  },
  activeLabel: {
    color: '#2DE0D2',
    fontWeight: '700',
  },
  pressed: {
    opacity: 1,
  },
  grabber: {
    alignSelf: 'center', 
    width: 107, 
    height: 4, 
    borderRadius: 3, 
    marginBottom: 8, 
    backgroundColor: '#D9D9D9' 
  },
});
