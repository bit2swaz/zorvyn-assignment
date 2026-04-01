import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Status } from '@prisma/client';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type { AuthenticatedRequest, AuthTokenPayload } from '../types/auth';

interface AppError extends Error {
  statusCode?: number;
}

const createUnauthorizedError = (): AppError => {
  const error = new Error('Unauthenticated or inactive user') as AppError;
  error.statusCode = 401;

  return error;
};

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim() || null;
};

export const requireAuth = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractBearerToken(request.get('Authorization'));

    if (!token) {
      throw createUnauthorizedError();
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw createUnauthorizedError();
    }

    const tokenPayload = decoded as AuthTokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status === Status.INACTIVE) {
      throw createUnauthorizedError();
    }

    (request as AuthenticatedRequest).user = user;
    next();
  } catch {
    next(createUnauthorizedError());
  }
};