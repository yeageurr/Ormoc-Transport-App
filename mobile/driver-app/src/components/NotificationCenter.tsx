import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getMyNotifications,
  markNotificationRead,
  type DriverNotification,
} from '@/api/notificationsAPI';

interface NotificationCenterValue {
  openNotifications: () => void;
  unreadCount: number;
}

const NotificationCenterContext = createContext<NotificationCenterValue | undefined>(undefined);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      setNotifications(await getMyNotifications());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openNotifications = useCallback(() => {
    setIsOpen(true);
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = useCallback(async (notificationId: number) => {
    const notification = notifications.find((item) => item.notification_id === notificationId);
    if (!notification || notification.is_read) {
      return;
    }

    setNotifications((current) => current.map((item) => (
      item.notification_id === notificationId ? { ...item, is_read: true } : item
    )));

    try {
      await markNotificationRead(notificationId);
    } catch {
      setNotifications((current) => current.map((item) => (
        item.notification_id === notificationId ? { ...item, is_read: false } : item
      )));
    }
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  return (
    <NotificationCenterContext.Provider value={{ openNotifications, unreadCount }}>
      {children}
      <NotificationPanel
        visible={isOpen}
        loading={isLoading}
        notifications={notifications}
        onClose={() => setIsOpen(false)}
        onNotificationPress={markRead}
      />
    </NotificationCenterContext.Provider>
  );
}

export function NotificationBell() {
  const { openNotifications, unreadCount } = useNotificationCenter();

  return (
    <Pressable
      accessibilityLabel="Open notifications"
      accessibilityRole="button"
      hitSlop={10}
      onPress={openNotifications}
      style={styles.bell}
    >
      <Ionicons name="notifications-outline" size={20} color="#2DD4BF" />
      {unreadCount > 0 && <View style={styles.badge} />}
    </Pressable>
  );
}

function useNotificationCenter(): NotificationCenterValue {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error('NotificationBell must be used within NotificationCenterProvider');
  }
  return context;
}

interface NotificationPanelProps {
  visible: boolean;
  loading: boolean;
  notifications: DriverNotification[];
  onClose: () => void;
  onNotificationPress: (notificationId: number) => void;
}

function NotificationPanel({
  visible,
  loading,
  notifications,
  onClose,
  onNotificationPress,
}: NotificationPanelProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(event) => event.stopPropagation()}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Notifications</Text>
              <Text style={styles.panelSubtitle}>Updates from ART Fusion</Text>
            </View>
            <Pressable accessibilityLabel="Close notifications" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#D7F5F0" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#2DD4BF" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={32} color="#7AA8A2" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>Account and dispatch updates will appear here.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {notifications.map((notification) => (
                <Pressable
                  key={notification.notification_id}
                  onPress={() => void onNotificationPress(notification.notification_id)}
                  style={[styles.notification, !notification.is_read && styles.unreadNotification]}
                >
                  <View style={styles.notificationIcon}>
                    <Ionicons name="information-circle-outline" size={19} color="#2DD4BF" />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationMessage}>
                      {notification.message ?? 'You have a new notification.'}
                    </Text>
                    <Text style={styles.notificationDate}>
                      {new Date(notification.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {!notification.is_read && <View style={styles.unreadDot} />}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#087A72',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFAD0A',
    borderWidth: 1,
    borderColor: '#087A72',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'flex-end',
  },
  panel: {
    width: '86%',
    maxWidth: 360,
    height: '100%',
    backgroundColor: '#062E2B',
    paddingTop: 54,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#176D64',
  },
  panelTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  panelSubtitle: { color: '#9EC9C3', fontSize: 10, marginTop: 3 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#075D54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    gap: 9,
  },
  emptyTitle: { color: '#E5FFFA', fontSize: 15, fontWeight: '700', marginTop: 5 },
  emptyText: { color: '#9EC9C3', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  list: { padding: 13 },
  notification: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 9,
  },
  unreadNotification: { backgroundColor: '#0B504A' },
  notificationIcon: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#075D54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCopy: { flex: 1 },
  notificationMessage: { color: '#E9FFFB', fontSize: 12, lineHeight: 17 },
  notificationDate: { color: '#9EC9C3', fontSize: 9, marginTop: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2DD4BF', marginTop: 5 },
});
