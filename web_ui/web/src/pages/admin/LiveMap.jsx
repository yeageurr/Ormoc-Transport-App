import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import LiveMapView from "../../components/map/LiveMap";
import { getLiveVehicles } from "../../api/vehiclesAPI";
import { getTerminals } from "../../api/terminalsAPI";
import { getRoutes } from "../../api/routesAPI";
import { useWebSocket } from "../../hooks/useWebsocket";

const ACTIVITY_LABELS = {
  active: "Active",
  loading: "Loading",
  "on-route": "On route",
};

const ACTIVITY_DOT_COLORS = {
  active: "#1D9E75",
  loading: "#ca8a04",
  "on-route": "#2563eb",
};

const ROUTE_PALETTE = ["#22D3EE", "#F59E0B", "#F472B6", "#A78BFA", "#34D399"];

export default function LiveMap() {
  const [vehicles, setVehicles] = useState({}); // keyed by vehicle_id
  const [routes, setRoutes] = useState([]);
  const [terminal, setTerminal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadInitialState = useCallback(async ({ silent = false } = {}) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // Single-terminal scope for this pilot — takes the first terminal
      // returned rather than hardcoding an id.
      const [liveVehicles, routeList, terminals] = await Promise.all([
        getLiveVehicles(),
        getRoutes(),
        getTerminals(),
      ]);

      const byId = {};
      liveVehicles.forEach((v) => {
        byId[v.vehicle_id] = v;
      });
      setVehicles(byId);
      setRoutes(routeList);
      setTerminal(terminals[0] || null);
    } catch (err) {
      setError(err.message || "Could not load the map data. Check that the API is reachable.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);

  // The WebSocket is the fast path. Polling keeps the display fresh if a
  // browser blocks the socket upgrade or it is reconnecting.
  useEffect(() => {
    const timer = setInterval(() => loadInitialState({ silent: true }), 15000);
    return () => clearInterval(timer);
  }, [loadInitialState]);

  const handleGpsUpdate = useCallback((data) => {
    // data: { vehicle_id, trip_id, latitude, longitude, speed_kmh, recorded_at }
    // vehicle_id assumes the small gps.py broadcast patch documented
    // alongside this page — the original broadcast only carried trip_id,
    // which Live Map has no way to resolve back to a vehicle on its own.
    setVehicles((prev) => {
      const existing = prev[data.vehicle_id];
      if (!existing) return prev; // vehicle not in the live snapshot yet
      return {
        ...prev,
        [data.vehicle_id]: {
          ...existing,
          current_latitude: data.latitude,
          current_longitude: data.longitude,
          current_speed_kmh: data.speed_kmh,
        },
      };
    });
  }, []);

  const { status: socketStatus } = useWebSocket({
    enabled: !isLoading,
    onMessage: (type, data) => {
      if (type === "gps_update") handleGpsUpdate(data);
    },
  });

  const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);

  return (
    <div>
      <PageHeader
        title="Live Map"
        onRefresh={() => loadInitialState({ silent: true })}
        isRefreshing={isRefreshing}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-[#3A1B14] bg-[#3A1B14]/20 px-4 py-3 text-sm text-[#D98B72]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-[#9fcabd] mb-3">
        <span
          className={`h-2 w-2 rounded-full ${
            socketStatus === "open"
              ? "bg-[#1D9E75]"
              : socketStatus === "closed"
              ? "bg-[#D98B72] animate-pulse"
              : "bg-amber-500 animate-pulse"
          }`}
        />
        {socketStatus === "open" ? "Live" : socketStatus === "closed" ? "Reconnecting…" : "Connecting…"}
      </div>

      <div className="relative z-10">
        {/* Map container keeps rounded corners & clipping isolated to itself */}
        <div className="h-[750px] rounded-[var(--input-radius)] overflow-hidden border border-white/10">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-[#9fcabd] text-sm bg-[#0a2420]">
              Loading map data…
            </div>
          ) : (
            <LiveMapView terminal={terminal} routes={routes} vehicles={vehicleList} />
          )}
        </div>

        {/* Raised z-index to z-20 so it sits cleanly on top of Leaflet/Mapbox canvas layers */}
        <aside className="absolute top-1/2 right-10 -translate-y-1/2 h-max z-[400] w-64 bg-[#0a2420] border border-white/10 rounded-2xl p-4 overflow-y-auto">
          <h2 className="text-[#eafff5] text-sm font-semibold mb-3">Routes</h2>
          <ul className="space-y-2 mb-6">
            {routes.map((route, i) => (
              <li key={route.route_id} className="flex items-center gap-2 text-sm text-[#9fcabd]">
                <span
                  className="h-2.5 w-6 rounded-full shrink-0"
                  style={{ background: ROUTE_PALETTE[i % ROUTE_PALETTE.length] }}
                />
                {route.destination?.name || `Route ${route.route_id}`}
              </li>
            ))}
          </ul>

          <h2 className="text-[#eafff5] text-sm font-semibold mb-3">Status</h2>
          <ul className="space-y-2">
            {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
              <li key={key} className="flex items-center gap-2 text-sm text-[#9fcabd]">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: ACTIVITY_DOT_COLORS[key] }}
                />
                {label}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
