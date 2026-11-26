import { Router } from 'express';
import { ROLES } from '../../config/roles.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './requirements.controller.js';

const router = Router();

// The Requirements module is admin-only (MD has no access, per the role table).
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/lookups', asyncHandler(controller.lookups)); // locations + vehicle types
router.get('/distance', asyncHandler(controller.distance)); // ?from=1&to=2
router.get('/', asyncHandler(controller.list)); // ?status=open|closed|all
router.post('/', asyncHandler(controller.create));
router.get('/:ref', asyncHandler(controller.get)); // REQ-0001 or numeric id

// Stage actions (each moves the requirement to the next stage)
router.post('/:ref/enquiry', asyncHandler(controller.sendEnquiry)); // 2
router.post('/:ref/quotations', asyncHandler(controller.recordQuotations)); // 3
router.post('/:ref/rate-approval', asyncHandler(controller.approveRate)); // 4
router.post('/:ref/booking', asyncHandler(controller.bookVehicle)); // 5
router.post('/:ref/milestones', asyncHandler(controller.recordMilestone)); // 6
router.post('/:ref/delivery', asyncHandler(controller.recordDelivery)); // 7
router.post('/:ref/payment', asyncHandler(controller.recordPayment)); // 8

export default router;
