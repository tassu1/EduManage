import axios from "axios";

/**
 * Single shared axios instance for the whole app.
 *
 * This replaces the pattern repeated in every dashboard file of:
 *   const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
 *   const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });
 *   axios.get(`${API}/api/...`, getAuthHeaders());
 *
 * Every existing endpoint path, HTTP method, and payload shape is
 * unchanged — this only removes the boilerplate around each call.
 * Call sites become: api.get('/api/super/dashboard')
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Consistent way to read an error message out of a failed request,
 * matching the `error.response?.data?.message || 'fallback'` pattern
 * used throughout the existing dashboards.
 */
export function getErrorMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;
