import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the stored JWT to every outgoing request, if present
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap the backend's {"error": {code, message, details}} shape into
// something components can read directly off err.message / err.details,
// and force a logout on any 401 (expired/invalid token).
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendError = error.response?.data?.error;

    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      if (window.location.pathname !== "/login") {
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