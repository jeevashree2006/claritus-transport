/**
 * Auth HTTP handlers: validate input, call the service, send the response.
 */
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import * as authService from './auth.service.js';

export async function login(req, res) {
  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username.trim() || !password) {
    throw new AppError('Enter your username and password.', 400);
  }

  const result = await authService.login(username, password);
  return sendSuccess(res, { message: 'Signed in.', data: result });
}

export async function me(req, res) {
  const user = await authService.getUserById(req.user.id);
  return sendSuccess(res, { message: 'Signed-in user.', data: { user } });
}
