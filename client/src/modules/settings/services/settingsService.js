/**
 * Settings API calls. The Settings screens get data ONLY through here.
 * Every endpoint returns { success, message, data }; these helpers return what the screen needs.
 */
import { api } from '../../../services/api';

export const settingsService = {
  /** [{ key, title, description, lastChanged, settings: [...] }] */
  async list() {
    const { data } = await api.get('/settings');
    return data.data.sections;
  },

  /** values = { '<settingKey>': value }. Returns { section, message, changed } */
  async save(sectionKey, values) {
    const { data } = await api.put(`/settings/${encodeURIComponent(sectionKey)}`, { values });
    return {
      section: data.data.section,
      message: data.message,
      changed: data.data.changed,
    };
  },

  /** Returns { section, message, changed } */
  async reset(sectionKey) {
    const { data } = await api.post(`/settings/${encodeURIComponent(sectionKey)}/reset`);
    return {
      section: data.data.section,
      message: data.message,
      changed: data.data.changed,
    };
  },
};

/** Field errors returned by the API for a 400 validation failure ({ '<settingKey>[.<sub>]': message }). */
export function getFieldErrors(error) {
  return error?.response?.data?.data?.errors || {};
}

export default settingsService;
