import axiosClient from "./axiosClient";

export const getRoutes = async () => {
  const response = await axiosClient.get("/routes");
  return response.data;
};
