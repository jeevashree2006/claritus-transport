/**
 * Every API response has the same shape: { success, message, data }.
 * Use these helpers instead of calling res.json() directly.
 */

export function sendSuccess(res, { data = null, message = 'OK', status = 200 } = {}) {
  return res.status(status).json({ success: true, message, data });
}

export function sendError(res, { message = 'Something went wrong.', status = 500, data = null } = {}) {
  return res.status(status).json({ success: false, message, data });
}
