import { useEffect, useState } from "react";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from "react-leaflet";
import GeofenceOverlay from "./GeofenceOverlay";
import VehicleMarker from "./VehicleMarker";
import "leaflet/dist/leaflet.css";

// Ormoc City Bus Terminal — fallback center used only until the terminal
// record resolves a real one.
const ORMOC_CENTER = [11.0064, 124.6075];

// Routes have no stored polyline (see models/route.py — just origin_id,
// destination_id, distance, average_travel_duration) and no color field.
// A straight line from the terminal to each destination is the most this
// data supports; colors are assigned client-side from a fixed palette so
// they're at least stable across reloads.
const ROUTE_PALETTE = ["#22D3EE", "#F59E0B", "#F472B6", "#A78BFA", "#34D399"];

const FOLLOW_ZOOM = 15;

function terminalCenter(terminal) {
  if (!terminal) return null;
  return [
    (terminal.min_latitude + terminal.max_latitude) / 2,
    (terminal.min_longitude + terminal.max_longitude) / 2,
  ];
}

// Lives inside MapContainer so it can reach the Leaflet map instance via
// useMap(). Re-centers on the followed vehicle every time `position`
// changes — i.e. on every gps_update broadcast for that vehicle_id.
function FollowController({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.flyTo(position, Math.max(map.getZoom(), FOLLOW_ZOOM), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, map]);

  return null;
}

// Clicking empty map area drops the current selection/follow. Leaflet
// stops click-event propagation from markers, so this only fires on
// genuine background clicks, not marker clicks.
function DeselectOnMapClick({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

export default function LiveMap({ terminal, routes, vehicles }) {
  const center = terminalCenter(terminal) || ORMOC_CENTER;
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const selectedVehicle = vehicles.find((v) => v.vehicle_id === selectedVehicleId) || null;
  const followPosition =
    selectedVehicle &&
    selectedVehicle.current_latitude != null &&
    selectedVehicle.current_longitude != null
      ? [selectedVehicle.current_latitude, selectedVehicle.current_longitude]
      : null;

  const handleSelect = (vehicleId) => {
    // Clicking the already-selected vehicle unfollows it.
    setSelectedVehicleId((prev) => (prev === vehicleId ? null : vehicleId));
  };

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <GeofenceOverlay terminal={terminal} />

      {terminalCenter(terminal) &&
        routes.map((route, i) => {
          if (!route.destination) return null;
          return (
            <Polyline
              key={route.route_id}
              positions={[
                terminalCenter(terminal),
                [route.destination.latitude, route.destination.longitude],
              ]}
              pathOptions={{ color: ROUTE_PALETTE[i % ROUTE_PALETTE.length], weight: 3 }}
            />
          );
        })}

      {vehicles.map((vehicle) => (
        <VehicleMarker
          key={vehicle.vehicle_id}
          vehicle={vehicle}
          isSelected={vehicle.vehicle_id === selectedVehicleId}
          onSelect={handleSelect}
        />
      ))}

      <FollowController position={followPosition} />
      <DeselectOnMapClick onDeselect={() => setSelectedVehicleId(null)} />
    </MapContainer>
  );
}
