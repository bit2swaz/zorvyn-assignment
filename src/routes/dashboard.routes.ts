import { Role } from '@prisma/client';
import { Router } from 'express';

import { getDashboardSummary } from '../controllers/dashboard.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { requireRole } from '../middlewares/requireRole';

const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth, requireRole([Role.ADMIN, Role.ANALYST, Role.VIEWER]));

dashboardRoutes.get('/summary', getDashboardSummary);

export { dashboardRoutes };