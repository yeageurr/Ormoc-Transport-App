import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const OVERLAY_MARGIN = 12;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export default function LiveMap() {
  const [vehicles, setVehicles] = useState({}); // keyed by vehicle_id
  const [routes, setRoutes] = useState([]);
  const [terminal, setTerminal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [isRoutesMinimized, setIsRoutesMinimized] = useState(false);
  const [routesOverlayPosition, setRoutesOverlayPosition] = useState(null);
  const mapFrameRef = useRef(null);
  const routesOverlayRef = useRef(null);
  const dragRef = useRef(null);

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

  const routesWithColors = useMemo(
    () => routes.map((route, index) => ({ ...route, mapColor: ROUTE_PALETTE[index % ROUTE_PALETTE.length] })),
    [routes],
  );
  const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);
  const visibleRoutes = useMemo(
    () => selectedRouteId === null ? routesWithColors : routesWithColors.filter((route) => route.route_id === selectedRouteId),
    [routesWithColors, selectedRouteId],
  );
  const visibleVehicles = useMemo(
    () => selectedRouteId === null ? vehicleList : vehicleList.filter((vehicle) => vehicle.route_id === selectedRouteId),
    [vehicleList, selectedRouteId],
  );

  useEffect(() => {
    const mapFrame = mapFrameRef.current;
    const overlay = routesOverlayRef.current;
    if (!mapFrame || !overlay) return undefined;

    const keepOverlayInBounds = () => {
      const maxX = mapFrame.clientWidth - overlay.offsetWidth - OVERLAY_MARGIN;
      const maxY = mapFrame.clientHeight - overlay.offsetHeight - OVERLAY_MARGIN;
      setRoutesOverlayPosition((current) => {
        if (current === null) {
          return {
            x: Math.max(OVERLAY_MARGIN, maxX - 28),
            y: Math.max(OVERLAY_MARGIN, (mapFrame.clientHeight - overlay.offsetHeight) / 2),
          };
        }
        return { x: clamp(current.x, OVERLAY_MARGIN, maxX), y: clamp(current.y, OVERLAY_MARGIN, maxY) };
      });
    };

    keepOverlayInBounds();
    const resizeObserver = new ResizeObserver(keepOverlayInBounds);
    resizeObserver.observe(mapFrame);
    resizeObserver.observe(overlay);
    return () => resizeObserver.disconnect();
  }, [isRoutesMinimized, routesWithColors.length]);

  const handleOverlayPointerDown = useCallback((event) => {
    if (event.button !== 0 || routesOverlayPosition === null) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      overlayX: routesOverlayPosition.x,
      overlayY: routesOverlayPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [routesOverlayPosition]);

  const handleOverlayPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    const mapFrame = mapFrameRef.current;
    const overlay = routesOverlayRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !mapFrame || !overlay) return;
    const maxX = mapFrame.clientWidth - overlay.offsetWidth - OVERLAY_MARGIN;
    const maxY = mapFrame.clientHeight - overlay.offsetHeight - OVERLAY_MARGIN;
    setRoutesOverlayPosition({
      x: clamp(drag.overlayX + event.clientX - drag.startX, OVERLAY_MARGIN, maxX),
      y: clamp(drag.overlayY + event.clientY - drag.startY, OVERLAY_MARGIN, maxY),
    });
  }, []);

  const handleOverlayPointerEnd = useCallback((event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }, []);

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

      <div ref={mapFrameRef} className="relative z-10">
        {/* Map container keeps rounded corners & clipping isolated to itself */}
        <div className="h-[750px] rounded-[var(--input-radius)] overflow-hidden border border-white/10">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-[#9fcabd] text-sm bg-[#0a2420]">
              Loading map data…
            </div>
          ) : (
            <LiveMapView terminal={terminal} routes={visibleRoutes} vehicles={visibleVehicles} />
          )}
        </div>

        <aside
          ref={routesOverlayRef}
          className="absolute z-[400] w-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a2420] shadow-xl"
          style={routesOverlayPosition ? { left: routesOverlayPosition.x, top: routesOverlayPosition.y } : { visibility: "hidden" }}
        >
          <div
            className="flex touch-none cursor-grab items-center justify-between gap-3 px-4 py-3 active:cursor-grabbing"
            onPointerDown={handleOverlayPointerDown}
            onPointerMove={handleOverlayPointerMove}
            onPointerUp={handleOverlayPointerEnd}
            onPointerCancel={handleOverlayPointerEnd}
          >
            <div className="flex items-center gap-2">
              <span className="text-[#9fcabd]" aria-hidden="true">⠿</span>
              <h2 className="text-sm font-semibold text-[#eafff5]">Routes</h2>
            </div>
            <button
              type="button"
              aria-label={isRoutesMinimized ? "Expand route filters" : "Minimize route filters"}
              aria-expanded={!isRoutesMinimized}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setIsRoutesMinimized((current) => !current)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#9fcabd] transition-colors hover:bg-white/10 hover:text-[#eafff5]"
            >
              {isRoutesMinimized ? "+" : "−"}
            </button>
          </div>

          {!isRoutesMinimized && <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setSelectedRouteId(null)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selectedRouteId === null ? "border-[#22D3EE] bg-[#0D5C64] text-[#E7FFFB]" : "border-white/15 bg-white/5 text-[#9fcabd] hover:bg-white/10"}`}
            >
              All routes
            </button>
            {routesWithColors.map((route) => {
              const isSelected = selectedRouteId === route.route_id;
              const vehicleCount = vehicleList.filter((vehicle) => vehicle.route_id === route.route_id && vehicle.current_latitude != null && vehicle.current_longitude != null).length;
              return (
                <button
                  key={route.route_id}
                  type="button"
                  onClick={() => setSelectedRouteId(route.route_id)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected ? "border-[#E7FFFB] bg-[#123E49] text-[#E7FFFB]" : "border-white/15 bg-white/5 text-[#9fcabd] hover:bg-white/10"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: route.mapColor }} />
                  {route.destination?.name || `Route ${route.route_id}`}
                  {vehicleCount > 0 && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-[#D9FFFA]">{vehicleCount}</span>}
                </button>
              );
            })}
            </div>

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
          </div>}
        </aside>
      </div>
    </div>
  );
}
