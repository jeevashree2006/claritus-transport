/**
 * Shared Axios instance. Every API call in the app goes through `api`.
 *  - baseURL: VITE_API_URL, or "/api" (proxied to the Express server by Vite in development)
 *  - attaches the JWT as "Authorization: Bearer <token>"
 *  - on 401 (expired/invalid session) clears the token and returns to /login
 */
import axios from 'axios';

const TOKEN_KEY = 'claritas_token';

/** Small wrapper around localStorage so the key lives in one place. */
export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode) - session lasts until reload */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    // A wrong password on the login form is also a 401 - that must stay on the form.
    if (status === 401 && !isLoginRequest) {
      tokenStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

/** Turns any Axios error into a sentence that's safe to show the user. */
export function getErrorMessage(error, fallback = 'Something went wrong. Try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.';
  if (error?.request && !error.response) return "Couldn't reach the server. Check your connection and try again.";
  // 5xx without our JSON body = the API is down or a proxy couldn't reach it.
  if (error?.response?.status >= 500) return "The server isn't responding right now. Try again in a moment.";
  return fallback;
}

export default api;
