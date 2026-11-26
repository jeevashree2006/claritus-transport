import { Router } from 'express';
import { ROLES } from '../../config/roles.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './settings.controller.js';

const router = Router();

// Administrators only (FRD: Admin manages users, roles, settings). MD gets 403.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', asyncHandler(controller.list)); // every section with values, defaults and last change
router.get('/:section', asyncHandler(controller.get));
router.put('/:section', asyncHandler(controller.save)); // body { values: { '<key>': value } }
router.post('/:section/reset', asyncHandler(controller.reset));

export default router;
