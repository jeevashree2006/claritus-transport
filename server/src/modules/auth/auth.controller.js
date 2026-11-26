/**
 * Auth HTTP handlers: validate input, call the service, send the response.
 */
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import * as authService from './auth.service.js';
import { recordAudit } from '../audit-logs/audit-logs.service.js';

export async function login(req, res) {
  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username.trim() || !password) {
    throw new AppError('Enter your username and password.', 400);
  }

  let result;
  try {
    result = await authService.login(username, password);
  } catch (error) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      await recordAudit({ req, user: {}, module: 'auth', action: 'sign_in_failed', summary: 'Failed sign-in',
        recordType: 'users', recordLabel: username.trim().toLowerCase().slice(0, 150), newValues: { reason: error.message } });
    }
    throw error;
  }
  await recordAudit({ req, user: result.user, module: 'auth', action: 'sign_in', summary: 'Signed in',
    recordType: 'users', recordId: result.user.id, recordLabel: result.user.name });
  return sendSuccess(res, { message: 'Signed in.', data: result });
}

export async function me(req, res) {
  const user = await authService.getUserById(req.user.id);
  return sendSuccess(res, { message: 'Signed-in user.', data: { user } });
}
