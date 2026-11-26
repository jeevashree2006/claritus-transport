/**
 * Transporters API calls. Screens in this module get data ONLY through here.
 * Every endpoint returns { success, message, data }; these helpers return what the screen needs.
 */
import { api } from '../../../services/api';

export const transportersService = {
  /** { items, counts: { all, active, inactive, bankPending } } */
  async list({ search = '', status = 'all', bank = '' } = {}) {
    const params = { status };
    if (search) params.search = search;
    if (bank) params.bank = bank;
    const { data } = await api.get('/transporters', { params });
    return data.data;
  },

  /** Full profile with history, balance and performance. ref = 'TR0001' or numeric id */
  async get(ref) {
    const { data } = await api.get(`/transporters/${encodeURIComponent(ref)}`);
    return data.data.transporter;
  },

  /** Returns { transporter, message } */
  async create(payload) {
    const { data } = await api.post('/transporters', payload);
    return { transporter: data.data.transporter, message: data.message };
  },

  /** Returns { transporter, message } */
  async update(ref, payload) {
    const { data } = await api.put(`/transporters/${encodeURIComponent(ref)}`, payload);
    return { transporter: data.data.transporter, message: data.message };
  },

  /** Deactivate or reactivate. Returns { transporter, message } */
  async setActive(ref, isActive) {
    const { data } = await api.patch(`/transporters/${encodeURIComponent(ref)}/status`, { isActive });
    return { transporter: data.data.transporter, message: data.message };
  },

  /** Second approval of pending bank details. Returns { transporter, message } */
  async approveBank(ref) {
    const { data } = await api.post(`/transporters/${encodeURIComponent(ref)}/bank/approve`);
    return { transporter: data.data.transporter, message: data.message };
  },

  /** Returns { transporter, message } */
  async rejectBank(ref, note) {
    const { data } = await api.post(`/transporters/${encodeURIComponent(ref)}/bank/reject`, { note });
    return { transporter: data.data.transporter, message: data.message };
  },
};

/** Field errors returned by the API for a 400 validation failure ({ field: message }). */
export function getFieldErrors(error) {
  return error?.response?.data?.data?.errors || {};
}

export default transportersService;
