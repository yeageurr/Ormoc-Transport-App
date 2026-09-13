import * as Location from 'expo-location';
import { useEffect } from 'react';

import { updateCurrentLocation } from '@/api/gpsAPI';

/** Sends foreground location fixes for a dispatched driver to the admin map. */
export function useCurrentLocation() {
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
        void updateCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speedKph: Math.max(0, (position.coords.speed ?? 0) * 3.6),
        }).catch(() => {
          // A missing current dispatch and temporary network failures do not
          // stop foreground GPS watching.
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
}
