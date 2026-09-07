import axiosClient from "./axiosClient";

// Admin: all trips across all drivers, embeds driver name + route
export const getAllTrips = async () => {
  const response = await axiosClient.get("/trips");
  return response.data;
};

// Single trip detail (admin or the trip's own driver)
export const getTrip = async (tripId) => {
  const response = await axiosClient.get(`/trips/${tripId}`);
  return response.data;
};

// Full GPS path for a trip — used to draw the route on a detail view
export const getTripPath = async (tripId) => {
  const response = await axiosClient.get(`/gps/trip/${tripId}`);
  return response.data;
};
