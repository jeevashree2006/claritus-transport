/**
 * Dashboard API call. The page gets its data ONLY through here.
 */
import { api } from '../../../services/api';

export const dashboardService = {
  /**
   * { period, periodOptions, lateAfterMinutes, generatedAt, kpis, tripStatus,
   *   requirementsByStage, recentRequirements, alerts }
   * period: '' = the default from Settings › Reports.
   */
  async get(period = '') {
    const { data } = await api.get('/dashboard', { params: period ? { period } : {} });
    return data.data;
  },
};

export default dashboardService;
