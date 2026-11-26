import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authController from './auth.controller.js';

const router = Router();

// POST /api/auth/login  -> { token, user }
router.post('/login', asyncHandler(authController.login));

// GET /api/auth/me      -> { user }   (requires Bearer token)
router.get('/me', authenticate, asyncHandler(authController.me));

export default router;
