import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, 
});
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendError = error.response?.data?.error;
    const publicAuthPaths = new Set([
      "/login",
      "/forgot-password",
      "/reset-password",
    ]);

    if (error.response?.status === 401) {
      if (!publicAuthPaths.has(window.location.pathname)) {
        window.location.href = "/login";
      }
    }

    if (backendError) {
      return Promise.reject({
        status: error.response.status,
        message: backendError.message,
        details: backendError.details,
      });
    }

    return Promise.reject({
      status: error.response?.status ?? null,
      message: "Something went wrong. Please check your connection and try again.",
      details: null,
    });
  }
);

export default axiosClient;
