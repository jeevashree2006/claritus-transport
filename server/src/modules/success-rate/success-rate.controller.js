/**
 * Success rate HTTP handlers. Read only.
 */
import { sendSuccess } from '../../utils/response.js';
import * as service from './success-rate.service.js';

export async function report(req, res) {
  const period = typeof req.query.period === 'string' && req.query.period ? req.query.period : undefined;
  const data = await service.getReport({ period });
  return sendSuccess(res, { message: 'Success rate.', data });
}
