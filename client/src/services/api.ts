import axios from 'axios';

// Production da to'liq URL, development da proxy orqali
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
// DO NOT auto-logout on 401 - let the app handle it gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-logout - just reject the error
    // The app will handle re-authentication if needed
    return Promise.reject(error);
  }
);

export default api;
