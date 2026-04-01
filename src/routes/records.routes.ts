import { Role } from '@prisma/client';
import { Router } from 'express';

import {
	createRecord,
	deleteRecord,
	getRecordById,
	getRecords,
	updateRecord,
} from '../controllers/record.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { requireRole } from '../middlewares/requireRole';

const recordsRoutes = Router();

recordsRoutes.use(requireAuth);

recordsRoutes.post('/', requireRole([Role.ADMIN]), createRecord);
recordsRoutes.get('/', requireRole([Role.ADMIN, Role.ANALYST]), getRecords);
recordsRoutes.get('/:id', requireRole([Role.ADMIN, Role.ANALYST]), getRecordById);
recordsRoutes.put('/:id', requireRole([Role.ADMIN]), updateRecord);
recordsRoutes.delete('/:id', requireRole([Role.ADMIN]), deleteRecord);

export { recordsRoutes };