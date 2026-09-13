import axiosClient from "./axiosClient";

// Admin: list all vehicles
export const getVehicles = async () => {
  const response = await axiosClient.get("/vehicles");
  return response.data;
};

// Admin: single vehicle detail
export const getVehicle = async (vehicleId) => {
  const response = await axiosClient.get(`/vehicles/${vehicleId}`);
  return response.data;
};

// Admin: drivers with no vehicle linked yet — for the owner dropdown
// on the Add Vehicle form (ownership is strictly 1 vehicle : 1 driver)
export const getEligibleOwners = async (vehicleId) => {
  const response = await axiosClient.get("/vehicles/eligible-owners", {
    params: vehicleId ? { vehicle_id: vehicleId } : undefined,
  });
  return response.data;
};

// Admin: register a new vehicle
export const createVehicle = async (payload) => {
  // payload: { owner_id, body_color, body_number, plate_number,
  //            vehicle_type, registry_expiration }
  const response = await axiosClient.post("/vehicles", payload);
  return response.data;
};

// Admin: edit a vehicle (condition, color, registry expiry, etc.)
export const updateVehicle = async (vehicleId, payload) => {
  const response = await axiosClient.patch(`/vehicles/${vehicleId}`, payload);
  return response.data;
};

// Admin: permanently remove an unused vehicle. The API protects vehicles
// that already have dispatch history.
export const deleteVehicle = async (vehicleId) => {
  await axiosClient.delete(`/vehicles/${vehicleId}`);
};

// Live snapshot for the Live Map's initial load (before WS pings arrive).
// Response fields (per the real `/vehicles/live` router — see
// LiveVehicleSummary in routers/vehicles.py):
//   vehicle_id, plate_number, activity_status, driver_name, route_label,
//   current_speed_kmh, current_latitude, current_longitude, body_color
// (body_color assumes the small backend patch documented alongside this
// file — without it, this field will just come back undefined and
// markers fall back to a default color.)
export const getLiveVehicles = async () => {
  const response = await axiosClient.get("/vehicles/live");
  return response.data;
};
