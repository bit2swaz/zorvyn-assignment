import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { Status } from '@prisma/client';

import type { AuthenticatedRequest } from '../types/auth';

interface AppError extends Error {
  statusCode?: number;
}

const createAppError = (statusCode: number, message: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;

  return error;
};

export const requireRole = (allowedRoles: Role[]) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const user = authenticatedRequest.user;

    if (!user || user.status === Status.INACTIVE) {
      next(createAppError(401, 'Unauthenticated or inactive user'));

      return;
    }

    if (!allowedRoles.includes(user.role)) {
      next(createAppError(403, 'Forbidden'));

      return;
    }

    next();
  };
};