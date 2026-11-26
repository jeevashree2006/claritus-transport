/**
 * Dashboard HTTP handler: read the period, call the service, send the response.
 */
import { sendSuccess } from '../../utils/response.js';
import * as service from './dashboard.service.js';

export async function get(req, res) {
  const period = typeof req.query.period === 'string' ? req.query.period.trim().slice(0, 40) : '';
  const data = await service.getDashboard({ period });
  return sendSuccess(res, { message: 'Dashboard.', data });
}
