import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { useEffect, useState } from 'react';

import { pingGeofence, updateCurrentLocation } from '@/api/gpsAPI';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  speedKph: number | null;
  geofence?: {
    currently_inside?: boolean;
    status_changed?: boolean;
    vehicle_status?: string;
    error?: string;
  };
}

/** Sends foreground location fixes for the driver's linked vehicle. */
export function useCurrentLocation() {
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let active = true;
    let isForeground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    let startInProgress = false;
    let requestedInitialPermission = false;

    const stopWatching = () => {
      subscription?.remove();
      subscription = null;
    };

    const start = async () => {
      if (!active || !isForeground || startInProgress) return;
      startInProgress = true;

      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted' && permission.canAskAgain && !requestedInitialPermission) {
          requestedInitialPermission = true;
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (!active || !isForeground) return;
        if (permission.status !== 'granted' || !await Location.hasServicesEnabledAsync()) {
          stopWatching();
          setLocation(null);
          return;
        }

        const sendLocation = (position: Location.LocationObject) => {
          if (!active || !isForeground) return;
          const fix = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speedKph: position.coords.speed === null
              ? null
              : Math.max(0, position.coords.speed * 3.6),
          };
          setLocation((current) => ({ ...fix, geofence: current?.geofence }));
          void updateCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speedKph: Math.max(0, (position.coords.speed ?? 0) * 3.6),
          }).catch(() => {
            // A missing trip and temporary network failures do not
            // stop foreground GPS watching.
          });
          void pingGeofence({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }).then((geofence) => {
            if (active) setLocation((current) => current ? ({ ...current, geofence }) : current);
          }).catch((error: any) => {
            // Keep the location watcher alive, but expose the error on the trip
            // screen so terminal-readiness failures aren't silently hidden.
            const detail = error?.response?.data?.detail || error?.message || 'Unable to confirm terminal geofence.';
            if (active) setLocation((current) => current ? ({ ...current, geofence: { error: detail } }) : current);
          });
        };

        // Refresh immediately on resume because the OS may have restored
        // permission or Location Services while this app was backgrounded.
        sendLocation(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

        if (!subscription) {
          const nextSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 10000,
              distanceInterval: 10,
            },
            sendLocation,
          );
          if (active && isForeground) subscription = nextSubscription;
          else nextSubscription.remove();
        }
      } catch {
        if (active && !subscription) setLocation(null);
      } finally {
        startInProgress = false;
      }
    };

    void start();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      isForeground = state === 'active';
      if (isForeground) void start();
      else stopWatching();
    });
    return () => {
      active = false;
      appStateSubscription.remove();
      stopWatching();
    };
  }, []);

  return location;
}
