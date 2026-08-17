import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track when login happened to avoid redirect right after login/refresh
let lastLoginTime = 0;

export function markLoginTime() {
  lastLoginTime = Date.now();
}

// Also mark on page load if token exists (covers refresh scenario)
if (localStorage.getItem('token')) {
  lastLoginTime = Date.now();
}

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/')) {
        const timeSinceLogin = Date.now() - lastLoginTime;
        if (timeSinceLogin > 5000) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
