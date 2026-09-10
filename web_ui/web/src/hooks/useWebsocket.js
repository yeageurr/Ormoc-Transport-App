import { useEffect, useRef, useState } from "react";

// Builds the WS URL from the same base the REST client uses, e.g.
// http://localhost:8000 -> ws://localhost:8000/ws
// https://api.example.com -> wss://api.example.com/ws
function buildSocketUrl() {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const url = new URL("/ws", base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

// Shared WebSocket connection to the backend's single ConnectionManager.
//
// Auth: no ?token= on the URL. The backend's ws_router.py now reads the
// `access_token` httpOnly cookie directly from the WS handshake's Cookie
// header (a small patch made alongside this hook — see the updated
// ws_router.py). Browsers send cookies automatically on same-origin WS
// upgrades, so this needs no frontend token handling at all. Before that
// patch, the old ?token=<jwt> approach could never have worked once the
// token moved into an httpOnly cookie — the frontend has no way to read it.
//
// Messages arrive as { type: string, data: object }. Pass an `onMessage`
// callback and switch on `type` yourself — this hook only owns the
// connection lifecycle (connect, reconnect with backoff, cleanup), not
// what any particular message means.
export function useWebSocket({ onMessage, enabled = true }) {
  const [status, setStatus] = useState("connecting"); // connecting | open | closed
  const socketRef = useRef(null);
  const retryDelayRef = useRef(1000);
  const retryTimerRef = useRef(null);
  const closedByUsRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    closedByUsRef.current = false;

    function connect() {
      setStatus("connecting");
      const socket = new WebSocket(buildSocketUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("open");
        retryDelayRef.current = 1000;
      };

      socket.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return; // ignore malformed frames
        }
        if (payload?.type) {
          onMessage(payload.type, payload.data);
        }
      };

      socket.onclose = (event) => {
        setStatus("closed");
        if (closedByUsRef.current) return;
        // 4401 = the server's custom "unauthorized" close code (see
        // ws_router.py) — retrying won't help until the session cookie
        // is valid again, so don't spin on it forever.
        if (event.code === 4401) return;
        retryTimerRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 15000);
          connect();
        }, retryDelayRef.current);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      closedByUsRef.current = true;
      clearTimeout(retryTimerRef.current);
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status };
}
