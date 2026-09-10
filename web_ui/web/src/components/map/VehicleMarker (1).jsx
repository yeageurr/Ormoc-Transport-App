import 'leaflet/dist/leaflet.css';
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { getContrastTextColor } from "../../utils/colorContrast";

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

function buildIcon(vehicle, isSelected) {
  const bg = vehicle.body_color || "#1D9E75";
  const fg = getContrastTextColor(bg);
  const label = (vehicle.plate_number || "").slice(-3) || "—";
  const size = isSelected ? 40 : 34;
  const ring = isSelected
    ? "box-shadow:0 0 0 3px #eafff5, 0 2px 6px rgba(0,0,0,0.45);"
    : "box-shadow:0 1px 3px rgba(0,0,0,0.35);";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:${bg};
        color:${fg};
        border-radius:9999px;
        width:${size}px;
        height:${size}px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:11px;
        font-weight:600;
        border:2px solid white;
        ${ring}
        transition: width 0.15s ease, height 0.15s ease;
      ">${label}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function VehicleMarker({ vehicle, isSelected = false, onSelect }) {
  if (vehicle.current_latitude == null || vehicle.current_longitude == null) {
    return null; // no GPS fix yet (e.g. vehicle not currently on a trip)
  }

  // ETA field name assumed as eta_minutes (falls back to eta) — adjust if
  // getLiveVehicles() returns a different key from eta_predictions.
  const eta = vehicle.eta_minutes ?? vehicle.eta ?? null;

  return (
    <Marker
      position={[vehicle.current_latitude, vehicle.current_longitude]}
      icon={buildIcon(vehicle, isSelected)}
      eventHandlers={{
        click: () => onSelect?.(vehicle.vehicle_id),
      }}
    >
      <Popup>
        <div className="text-sm space-y-1 min-w-[160px]">
          <div className="font-semibold text-slate-900">{vehicle.plate_number}</div>
          <div className="text-slate-600">{vehicle.route_label || "Unassigned route"}</div>
          <div className="text-slate-600">{vehicle.driver_name || "No driver on record"}</div>
          <div className="flex items-center gap-1.5 pt-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: ACTIVITY_DOT_COLORS[vehicle.activity_status] || "#94a3b8" }}
            />
            <span>{ACTIVITY_LABELS[vehicle.activity_status] || vehicle.activity_status}</span>
          </div>
          {vehicle.current_speed_kmh != null && (
            <div className="text-slate-500">{Number(vehicle.current_speed_kmh).toFixed(0)} km/h</div>
          )}
          {eta != null && <div className="text-slate-500">ETA: {eta} min</div>}
        </div>
      </Popup>
    </Marker>
  );
}
