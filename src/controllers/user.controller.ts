import type { Request, Response } from 'express';

import type {
  CreateUserInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from '../schemas/user.schema';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

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