/**
 * Authentication and authorization middleware.
 *
 *   router.get('/', authenticate, authorize(ROLES.ADMIN), handler);
 *   router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MD), handler);
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/** Requires a valid "Authorization: Bearer <token>" header and sets req.user. */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Sign in to continue.', 401));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: Number(payload.sub), role: payload.role, username: payload.username };
    return next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Sign in again.'
        : 'Your session is not valid. Sign in again.';
    return next(new AppError(message, 401));
  }
}

/** Allows the request only if req.user.role is one of the given roles. */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Sign in to continue.', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You don't have access to this.", 403));
    }
    return next();
  };
}
