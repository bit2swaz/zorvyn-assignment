import { Role } from '@prisma/client';
import { Router } from 'express';

import {
  createUser,
  getUsers,
  updateUserRole,
  updateUserStatus,
} from '../controllers/user.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { requireRole } from '../middlewares/requireRole';
import { validateResource } from '../middlewares/validateResource';
import {
  createUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../schemas/user.schema';

const usersRoutes = Router();

usersRoutes.use(requireAuth, requireRole([Role.ADMIN]));

usersRoutes.get('/', getUsers);
usersRoutes.post('/', validateResource(createUserSchema), createUser);
usersRoutes.patch('/:id/role', validateResource(updateUserRoleSchema), updateUserRole);
usersRoutes.patch('/:id/status', validateResource(updateUserStatusSchema), updateUserStatus);

export { usersRoutes };