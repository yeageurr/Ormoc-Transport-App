import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const ORMOC_CENTER = [124.6075, 11.0064];
const ROUTE_PALETTE = ["#22D3EE", "#F59E0B", "#F472B6", "#A78BFA", "#34D399"];
const FOLLOW_ZOOM = 15;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function terminalCenter(terminal) {
  if (!terminal) return null;
  return [(terminal.min_longitude + terminal.max_longitude) / 2, (terminal.min_latitude + terminal.max_latitude) / 2];
}

function mapData(terminal, routes, vehicles, selectedVehicleId) {
  const center = terminalCenter(terminal);
  const geofence = terminal ? {
    type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[
      [terminal.min_longitude, terminal.min_latitude], [terminal.max_longitude, terminal.min_latitude],
      [terminal.max_longitude, terminal.max_latitude], [terminal.min_longitude, terminal.max_latitude],
      [terminal.min_longitude, terminal.min_latitude],
    ]] },
  } : null;
  return {
    geofence: { type: "FeatureCollection", features: geofence ? [geofence] : [] },
    routes: { type: "FeatureCollection", features: center ? routes.filter((route) => route.destination).map((route, index) => ({
      type: "Feature", properties: { color: ROUTE_PALETTE[index % ROUTE_PALETTE.length] },
      geometry: { type: "LineString", coordinates: [center, [route.destination.longitude, route.destination.latitude]] },
    })) : [] },
    vehicles: { type: "FeatureCollection", features: vehicles
      .filter((vehicle) => vehicle.current_latitude != null && vehicle.current_longitude != null)
      .map((vehicle) => ({
        type: "Feature",
        properties: {
          vehicleId: vehicle.vehicle_id, plateNumber: vehicle.plate_number || "—",
          routeLabel: vehicle.route_label || "Unassigned route", driverName: vehicle.driver_name || "No driver on record",
          activityStatus: vehicle.activity_status || "Unknown", speedKmh: vehicle.current_speed_kmh,
          color: vehicle.body_color || "#1D9E75", selected: vehicle.vehicle_id === selectedVehicleId,
        },
        geometry: { type: "Point", coordinates: [vehicle.current_longitude, vehicle.current_latitude] },
      })) },
  };
}

function addMapLayers(map) {
  map.addSource("terminal-geofence", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "terminal-geofence-fill", type: "fill", source: "terminal-geofence", paint: { "fill-color": "#1D9E75", "fill-opacity": 0.08 } });
  map.addLayer({ id: "terminal-geofence-outline", type: "line", source: "terminal-geofence", paint: { "line-color": "#1D9E75", "line-width": 2, "line-dasharray": [2, 2] } });
  map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "routes-line", type: "line", source: "routes", paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.9 } });
  map.addSource("vehicles", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "vehicle-points", type: "circle", source: "vehicles", paint: {
    "circle-radius": ["case", ["get", "selected"], 12, 9], "circle-color": ["get", "color"],
    "circle-stroke-color": "#FFFFFF", "circle-stroke-width": ["case", ["get", "selected"], 4, 2], "circle-opacity": 1,
  } });
}

function syncMapData(map, terminal, routes, vehicles, selectedVehicleId) {
  const data = mapData(terminal, routes, vehicles, selectedVehicleId);
  map.getSource("terminal-geofence")?.setData(data.geofence);
  map.getSource("routes")?.setData(data.routes);
  map.getSource("vehicles")?.setData(data.vehicles);
}

function vehiclePopup(feature) {
  const content = document.createElement("div");
  content.className = "text-sm space-y-1 min-w-[160px]";
  const details = [
    ["font-semibold text-slate-900", feature.properties.plateNumber], ["text-slate-600", feature.properties.routeLabel],
    ["text-slate-600", feature.properties.driverName], ["text-slate-600", feature.properties.activityStatus],
    ["text-slate-500", feature.properties.speedKmh != null ? `${Number(feature.properties.speedKmh).toFixed(0)} km/h` : null],
  ];
  details.filter(([, value]) => value != null).forEach(([className, value]) => {
    const line = document.createElement("div");
    line.className = className;
    line.textContent = value;
    content.appendChild(line);
  });
  return content;
}

export default function LiveMap({ terminal, routes, vehicles }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const initialTerminalRef = useRef(terminal);
  const [isReady, setIsReady] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    const initialTerminal = initialTerminalRef.current;
    const map = new mapboxgl.Map({ container: containerRef.current, accessToken: MAPBOX_TOKEN, style: "mapbox://styles/mapbox/streets-v12", center: terminalCenter(initialTerminal) || ORMOC_CENTER, zoom: initialTerminal ? 13 : 12 });
    map.addControl(new mapboxgl.NavigationControl(), "top-left");
    map.on("load", () => { addMapLayers(map); setIsReady(true); });
    map.on("click", "vehicle-points", (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      setSelectedVehicleId(feature.properties.vehicleId);
      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({ offset: 14 }).setLngLat(feature.geometry.coordinates.slice()).setDOMContent(vehiclePopup(feature)).addTo(map);
    });
    map.on("mouseenter", "vehicle-points", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "vehicle-points", () => { map.getCanvas().style.cursor = ""; });
    map.on("click", (event) => {
      if (!map.queryRenderedFeatures(event.point, { layers: ["vehicle-points"] }).length) { popupRef.current?.remove(); setSelectedVehicleId(null); }
    });
    mapRef.current = map;
    return () => { popupRef.current?.remove(); map.remove(); mapRef.current = null; setIsReady(false); };
  }, []);

  useEffect(() => {
    if (mapRef.current && isReady) syncMapData(mapRef.current, terminal, routes, vehicles, selectedVehicleId);
  }, [isReady, terminal, routes, vehicles, selectedVehicleId]);

  useEffect(() => {
    const selectedVehicle = vehicles.find((vehicle) => vehicle.vehicle_id === selectedVehicleId);
    if (!mapRef.current || !isReady || selectedVehicle?.current_latitude == null || selectedVehicle?.current_longitude == null) return;
    mapRef.current.flyTo({ center: [selectedVehicle.current_longitude, selectedVehicle.current_latitude], zoom: Math.max(mapRef.current.getZoom(), FOLLOW_ZOOM), duration: 800 });
  }, [isReady, selectedVehicleId, vehicles]);

  if (!MAPBOX_TOKEN) return <div className="h-full flex items-center justify-center bg-[#0a2420] px-6 text-center text-sm text-[#9fcabd]">Mapbox is unavailable. Set VITE_MAPBOX_ACCESS_TOKEN in web_ui/web/.env.</div>;
  return <div ref={containerRef} className="h-full w-full" />;
}
