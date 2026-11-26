import { Router } from 'express';
import { ROLES } from '../../config/roles.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './audit-logs.controller.js';

const router = Router();

// Administrators only. Entries are read-only: no POST / PUT / PATCH / DELETE routes on purpose.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', asyncHandler(controller.list)); // ?from&to&userId&module&action&q&page&pageSize
router.get('/options', asyncHandler(controller.options)); // users, modules, actions for filters
router.get('/export', asyncHandler(controller.exportEntries)); // same filters -> all rows for the Excel file

export default router;
