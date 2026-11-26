import { Router } from 'express';
import { testConnection } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendError, sendSuccess } from '../../utils/response.js';

const router = Router();

// GET /api/health -> API status + database status
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    try {
      await testConnection();
      return sendSuccess(res, {
        message: 'API is up and the database is connected.',
        data: { api: 'up', database: 'connected', time: new Date().toISOString() },
      });
    } catch (error) {
      console.error('[health] Database check failed:', error.message);
      return sendError(res, {
        status: 503,
        message: 'API is up but the database is not reachable.',
        data: { api: 'up', database: 'disconnected', time: new Date().toISOString() },
      });
    }
  })
);

export default router;
