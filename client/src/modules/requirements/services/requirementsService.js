/**
 * Requirements API calls. Screens in this module get data ONLY through here.
 * Every endpoint returns { success, message, data }; these helpers return `data`.
 */
import { api } from '../../../services/api';

export const requirementsService = {
  /** { locations: [{id,name,state}], vehicleTypes: [{id,name,capacityTonnes}] } */
  async lookups() {
    const { data } = await api.get('/requirements/lookups');
    return data.data;
  },

  /** { distanceKm, method } for two location ids */
  async distance(fromId, toId) {
    const { data } = await api.get('/requirements/distance', { params: { from: fromId, to: toId } });
    return data.data;
  },

  /** { items, counts: { open, closed, all } }  status: 'open' | 'closed' | 'all' */
  async list(status = 'open') {
    const { data } = await api.get('/requirements', { params: { status } });
    return data.data;
  },

  /** Requirement with history. ref = 'REQ-0001' or numeric id */
  async get(ref) {
    const { data } = await api.get(`/requirements/${encodeURIComponent(ref)}`);
    return data.data.requirement;
  },

  /** Creates a requirement and returns it. */
  async create(payload) {
    const { data } = await api.post('/requirements', payload);
    return data.data.requirement;
  },

  /* ---- Stage actions: each returns the updated requirement ---- */

  /** Stage 2: { transporterIds: [1, 3] } */
  sendEnquiry: (ref, payload) => stageAction(ref, 'enquiry', payload),

  /** Stage 3: { quotes: [{ transporterId, amount }] } */
  recordQuotations: (ref, payload) => stageAction(ref, 'quotations', payload),

  /** Stage 4: { transporterId, approvedRate, note } */
  approveRate: (ref, payload) => stageAction(ref, 'rate-approval', payload),

  /** Stage 5: { vehicleNo, driverName, driverMobile, expectedReportingAt } */
  bookVehicle: (ref, payload) => stageAction(ref, 'booking', payload),

  /** Stage 6: { milestone: 'loaded' | 'departed' | 'reached' | 'unloaded', note } */
  recordMilestone: (ref, payload) => stageAction(ref, 'milestones', payload),

  /** Stage 7: { podNumber, damageAmount, damageNote } */
  recordDelivery: (ref, payload) => stageAction(ref, 'delivery', payload),

  /** Stage 8: { amount, utr } */
  recordPayment: (ref, payload) => stageAction(ref, 'payment', payload),
};

async function stageAction(ref, action, payload) {
  const { data } = await api.post(`/requirements/${encodeURIComponent(ref)}/${action}`, payload);
  return data.data.requirement;
}

/** Field errors returned by the API for a 400 validation failure ({ field: message }). */
export function getFieldErrors(error) {
  return error?.response?.data?.data?.errors || {};
}

export default requirementsService;
