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
  // payload: { first_name, last_name, contact_number, email, license_num,
  //            license_expiry, password? }
  const response = await axiosClient.post("/accounts/drivers", payload);
  return response.data;
};

// Admin: edit a driver's profile — unlike the driver's own self-edit,
// this CAN touch contact_number (also updates their login username) and
// license fields.
export const updateDriver = async (userId, payload) => {
  const response = await axiosClient.patch(`/accounts/drivers/${userId}`, payload);
  return response.data;
};

// Admin: suspend a driver account
export const suspendDriver = async (userId) => {
  const response = await axiosClient.patch(`/accounts/drivers/${userId}/suspend`);
  return response.data;
};

// Admin: reactivate a previously suspended driver
export const reactivateDriver = async (userId) => {
  const response = await axiosClient.patch(`/accounts/drivers/${userId}/reactivate`);
  return response.data;
};

// Admin: soft-delete a driver (flips status to disabled, preserves history)
export const deleteDriver = async (userId) => {
  const response = await axiosClient.delete(`/accounts/drivers/${userId}`);
  return response.data;
};