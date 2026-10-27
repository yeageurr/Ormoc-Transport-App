import * as Location from 'expo-location';
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
    elapsed_seconds?: number;
    remaining_seconds?: number;
    dwell_threshold_seconds?: number;
    error?: string;
  };
}

/** Sends foreground location fixes for the driver's linked vehicle. */
export function useCurrentLocation() {
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let active = true;

    const start = async () => {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== 'granted' || !await Location.hasServicesEnabledAsync()) return;

      const sendLocation = (position: Location.LocationObject) => {
        if (!active) return;
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
          // A missing current dispatch and temporary network failures do not
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

      // A watch callback may not fire until the device moves. Send one
      // location immediately so a stationary dispatched driver is visible.
      sendLocation(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        sendLocation,
      );
    };

    void start();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return location;
}
