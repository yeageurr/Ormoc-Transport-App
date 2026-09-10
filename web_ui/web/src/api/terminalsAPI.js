import axiosClient from "./axiosClient";

// GET /terminals/{id} — the terminal record itself, which IS the geofence:
// there's no separate boundary endpoint. The rectangular geofence is just
// four fields on the terminal row (see models/terminal.py):
//   { terminal_id, admin_id, terminal_name,
//     min_latitude, min_longitude, max_latitude, max_longitude, address }
// Render it on the map as a Rectangle using
// [[min_latitude, min_longitude], [max_latitude, max_longitude]] as bounds.
export const getTerminal = async (terminalId) => {
  const response = await axiosClient.get(`/terminals/${terminalId}`);
  return response.data;
};

// GET /terminals — full list, useful if the single-terminal assumption
// ever needs to change; not currently used by Live Map.
export const getTerminals = async () => {
  const response = await axiosClient.get("/terminals");
  return response.data;
};
