import { Router } from 'express';
import { ROLES } from '../../config/roles.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './transporters.controller.js';

const router = Router();

// The Transporters module is admin-only (MD has no access, per the role table).
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', asyncHandler(controller.list)); // ?search=&status=active|inactive|all&bank=pending
router.post('/', asyncHandler(controller.create));
router.get('/:ref', asyncHandler(controller.get)); // TR0001 or numeric id
router.put('/:ref', asyncHandler(controller.update));
router.patch('/:ref/status', asyncHandler(controller.setStatus)); // { isActive: boolean }
router.post('/:ref/bank/approve', asyncHandler(controller.approveBank));
router.post('/:ref/bank/reject', asyncHandler(controller.rejectBank)); // { note }

export default router;
