/**
 * An expected, user-facing error. Throw it from services/controllers and the
 * error handler turns it into { success: false, message } with the right status.
 *
 *   throw new AppError('Transporter not found.', 404);
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}
