/**
 * Auth API calls. Responses are { success, message, data } - these helpers return `data`.
 */
import { api, tokenStorage } from './api';

export const authService = {
  /** Signs in and stores the token. Returns the user. */
  async login(username, password) {
    const { data } = await api.post('/auth/login', { username, password });
    tokenStorage.set(data.data.token);
    return data.data.user;
  },

  /** Returns the signed-in user for the stored token (throws if the token is not valid). */
  async me() {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  },

  logout() {
    tokenStorage.clear();
  },

  hasToken() {
    return Boolean(tokenStorage.get());
  },
};

export default authService;
