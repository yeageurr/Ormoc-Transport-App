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
export const getEligibleOwners = async () => {
  const response = await axiosClient.get("/vehicles/eligible-owners");
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

// Live snapshot for the Live Map's initial load (before WS pings arrive)
export const getLiveVehicles = async () => {
  const response = await axiosClient.get("/vehicles/live");
  return response.data;
};
