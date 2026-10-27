import axiosClient from "./axiosClient";

// Admin: list all drivers (Users table on the admin dashboard)
export const getDrivers = async () => {
  const response = await axiosClient.get("/accounts/drivers");
  return response.data;
};

// Admin: get a single driver's profile
export const getDriver = async (userId) => {
  const response = await axiosClient.get(`/users/${userId}`);
  return response.data;
};

// Admin: create a new driver account (Add User)
export const createDriver = async (payload) => {
  // Include exactly one of `vehicle` (new) or `vehicle_id` (borrow existing).
  const response = await axiosClient.post("/accounts/drivers", payload);
  return response.data;
};

export const getBorrowableVehicles = async () => {
  const response = await axiosClient.get("/vehicles/borrowable");
  return response.data;
};

// Admin: edit regulatory details only (driver license and active vehicle plate).
export const updateDriver = async (userId, payload) => {
  const response = await axiosClient.patch(`/accounts/drivers/${userId}`, payload);
  return response.data;
};

// Admin: suspend a driver account
export const suspendDriver = async (userId) => {
  const response = await axiosClient.patch(`/accounts/drivers/${userId}/suspend`);
  return response.data;
};

// Admin: reactivate a previously suspended or disabled driver
export const reactivateDriver = async (userId) => {
  const response = await axiosClient.patch(`/accounts/drivers/${userId}/reactivate`);
  return response.data;
};

// Admin: soft-delete a driver (flips status to disabled, preserves history)
export const deleteDriver = async (userId) => {
  const response = await axiosClient.delete(`/accounts/drivers/${userId}`);
  return response.data;
};
