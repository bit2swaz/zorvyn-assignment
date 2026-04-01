import type { Request, Response } from 'express';

import type {
  CreateUserInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from '../schemas/user.schema';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users returned successfully.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a user directly
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role, status]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [VIEWER, ANALYST, ADMIN]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 * /api/v1/users/{id}/role:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update a user's role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [VIEWER, ANALYST, ADMIN]
 *     responses:
 *       200:
 *         description: Role updated successfully.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 * /api/v1/users/{id}/status:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update a user's status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Status updated successfully.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 */

const getUserIdParam = (request: Request): string => {
  const userId = request.params.id;

  if (!userId || Array.isArray(userId)) {
    const error = new Error('Resource not found or invalid input') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;

    throw error;
  }

  return userId;
};

export const getUsers = asyncHandler(async (_request: Request, response: Response) => {
  const users = await userService.listUsers();

  sendSuccess(response, {
    message: 'Operation successful',
    data: users,
  });
});

export const createUser = asyncHandler(async (request: Request, response: Response) => {
  const user = await userService.createUser(request.body as CreateUserInput);

  sendSuccess(response, {
    statusCode: 201,
    message: 'Operation successful',
    data: user,
  });
});

export const updateUserRole = asyncHandler(async (request: Request, response: Response) => {
  const user = await userService.updateUserRole(getUserIdParam(request), request.body as UpdateUserRoleInput);

  sendSuccess(response, {
    message: 'Operation successful',
    data: user,
  });
});

export const updateUserStatus = asyncHandler(async (request: Request, response: Response) => {
  const user = await userService.updateUserStatus(
    getUserIdParam(request),
    request.body as UpdateUserStatusInput,
  );

  sendSuccess(response, {
    message: 'Operation successful',
    data: user,
  });
});