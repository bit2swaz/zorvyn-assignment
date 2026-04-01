import { Role } from '@prisma/client';
import { Router } from 'express';

import { createRecord, getRecordById, getRecords } from '../controllers/record.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { requireRole } from '../middlewares/requireRole';

const recordsRoutes = Router();

recordsRoutes.use(requireAuth);

recordsRoutes.post('/', requireRole([Role.ADMIN]), createRecord);
recordsRoutes.get('/', requireRole([Role.ADMIN, Role.ANALYST]), getRecords);
recordsRoutes.get('/:id', requireRole([Role.ADMIN, Role.ANALYST]), getRecordById);

export { recordsRoutes };