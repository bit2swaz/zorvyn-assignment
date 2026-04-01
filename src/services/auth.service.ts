import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, Role, Status } from '@prisma/client';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type { AuthTokenPayload } from '../types/auth';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

interface AppError extends Error {
  statusCode?: number;
  details?: Array<{ field: string; message: string }>;
}

const createAppError = (
  statusCode: number,
  message: string,
  details: Array<{ field: string; message: string }> = [],
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.details = details;

  return error;
};

export const authService = {
  async register(input: RegisterInput) {
    try {
      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: Role.VIEWER,
          status: Status.ACTIVE,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw createAppError(400, 'Resource not found or invalid input', [
          { field: 'email', message: 'Email already exists' },
        ]);
      }

      throw error;
    }
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw createAppError(401, 'Unauthenticated or inactive user');
    }

    if (user.status === Status.INACTIVE) {
      throw createAppError(401, 'Unauthenticated or inactive user');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw createAppError(401, 'Unauthenticated or inactive user');
    }

    const tokenPayload: AuthTokenPayload = { sub: user.id };
    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '1h' });

    return {
      token,
    };
  },
};