/**
 * Wraps an async route handler so rejected promises reach the error handler
 * (Express 4 does not do this on its own).
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
