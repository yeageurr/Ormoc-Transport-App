import { useEffect, useRef } from 'react';

import { getStoredToken } from '@/api/authAPI';

type PassengerQueueCountEvent = {
  type: 'passenger_queue_count';
  data: { route_id: number; count: number };
};

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Keeps the driver's live queue count in sync with commuter join/leave events. */
export function useDriverPassengerQueueUpdates(onCount: (count: number) => void) {
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelayMs = 1_000;

    const connect = async () => {
      const token = await getStoredToken();
      if (disposed || !token) return;

      const socketUrl = `${API_URL.replace(/^http/, 'ws')}/ws`;
      try {
        // React Native's WebSocket implementation accepts handshake headers.
        socket = new WebSocket(socketUrl, [], {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => { retryDelayMs = 1_000; };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as PassengerQueueCountEvent;
          if (payload.type === 'passenger_queue_count' && Number.isFinite(payload.data?.count)) {
            onCountRef.current(payload.data.count);
          }
        } catch {
          // Ignore unrelated or malformed socket events.
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        socket = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
        void connect();
      }, retryDelayMs);
    };

    void connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);
}
