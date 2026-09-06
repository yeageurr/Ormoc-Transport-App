import axiosClient from "./axiosClient";

/**
 * Fetch all incident logs from the database
 */
export async function fetchIncidents() {
  try {
    const response = await axiosClient.get("/incidents");
    return response.data;
  } catch (err) {
    console.error("API Error (fetchIncidents):", err);
    throw err;
  }
}

/**
 * Fetch a single incident log by ID
 */
export async function fetchIncidentById(id) {
  try {
    const response = await axiosClient.get(`/incidents/${id}`);
    return response.data;
  } catch (err) {
    console.error(`API Error (fetchIncidentById ID: ${id}):`, err);
    throw err;
  }
}