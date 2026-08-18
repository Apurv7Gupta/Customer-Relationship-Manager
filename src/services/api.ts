import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // authentication failure => Clear local state
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user_data");

      // Hard redirect (avoid stale React state)
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
