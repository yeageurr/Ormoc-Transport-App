import axiosClient from "./axiosClient";

export const getDispatches = async () => {
  const response = await axiosClient.get("/dispatch");
  return response.data;
};

export const getDispatch = async (dispatchId) => {
  const response = await axiosClient.get(`/dispatch/${dispatchId}`);
  return response.data;
};

export const createDispatch = async (payload) => {
  // payload: { driver_id, vehicle_id, route_id, effective_on }
  const response = await axiosClient.post("/dispatch", payload);
  return response.data;
};

export const createDispatchBatch = async (dispatches) => (await axiosClient.post("/dispatch/batch", { dispatches })).data;
export const updateDispatch = async (dispatchId, payload) => (await axiosClient.patch(`/dispatch/${dispatchId}`, payload)).data;
