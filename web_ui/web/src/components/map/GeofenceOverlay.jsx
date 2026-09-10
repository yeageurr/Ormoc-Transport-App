import 'leaflet/dist/leaflet.css';
import { Rectangle } from "react-leaflet";

// Terminal geofence — a plain rectangular bounding box (see
// models/terminal.py: min/max latitude/longitude), read-only, seeded once
// at deployment and never editable through the app.
export default function GeofenceOverlay({ terminal }) {
  if (!terminal) return null;

  const bounds = [
    [terminal.min_latitude, terminal.min_longitude],
    [terminal.max_latitude, terminal.max_longitude],
  ];

  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        color: "#1D9E75",
        weight: 2,
        dashArray: "6 4",
        fillOpacity: 0.05,
      }}
    />
  );
}
