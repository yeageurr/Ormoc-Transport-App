import axiosClient from "./axiosClient";

export const getDashboardStats = async () => {
  const response = await axiosClient.get("/dashboard/stats");
  return response.data;
};

export const getTripVolume = async () => {
  const response = await axiosClient.get("/dashboard/trip-volume");
  return response.data;
};

export const getRecentIncidents = async () => {
  const response = await axiosClient.get("/dashboard/recent-incidents");
  return response.data;
};
