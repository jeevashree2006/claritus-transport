/**
 * Success rate API calls. The screen gets data ONLY through here.
 */
import { api } from '../../../services/api';

export const successRateService = {
  /** { period, periodOptions, lateAfterMinutes, totals, funnel, transporters } */
  async report(period) {
    const params = period ? { period } : {};
    const { data } = await api.get('/success-rate', { params });
    return data.data;
  },
};

export default successRateService;
