import { Router } from 'express';
import { ROLES } from '../../config/roles.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './success-rate.controller.js';

const router = Router();

// Administrator and Managing Director (view only). There are no write routes.
router.use(authenticate, authorize(ROLES.ADMIN, ROLES.MD));

router.get('/', asyncHandler(controller.report)); // ?period=this_month|last_30_days|this_quarter|this_financial_year|all

export default router;
