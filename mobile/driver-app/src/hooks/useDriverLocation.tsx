import { createContext, useContext, type ReactNode } from 'react';

import { type DriverLocation, useCurrentLocation } from '@/hooks/useCurrentLocation';

const DriverLocationContext = createContext<DriverLocation | null>(null);

export function DriverLocationProvider({ children }: { children: ReactNode }) {
  const location = useCurrentLocation();

  return (
    <DriverLocationContext.Provider value={location}>
      {children}
    </DriverLocationContext.Provider>
  );
}

export function useDriverLocation() {
  return useContext(DriverLocationContext);
}
