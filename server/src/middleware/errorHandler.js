/**
 * 404 handler for unknown routes + the central error handler.
 * Register both LAST in app.js.
 */
import { isProduction } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Malformed JSON body sent by the client
  if (err.type === 'entity.parse.failed') {
    return sendError(res, { status: 400, message: 'The request body is not valid JSON.' });
  }

  if (err instanceof AppError) {
    return sendError(res, { status: err.statusCode, message: err.message, data: err.details });
  }

  // Unexpected error: log the details, but never leak them to the client in production.
  console.error('[error]', err);
  return sendError(res, {
    status: 500,
    message: isProduction ? 'Something went wrong. Try again.' : err.message || 'Something went wrong.',
  });
}
