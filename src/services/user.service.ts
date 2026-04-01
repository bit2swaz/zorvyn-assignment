import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import type {
  CreateUserInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from '../schemas/user.schema';

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

const toPublicUser = (user: {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const userService = {
  async listUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map(toPublicUser);
  },

  async createUser(input: CreateUserInput) {
    try {
      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          status: input.status,
        },
      });

      return toPublicUser(user);
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

  async updateUserRole(userId: string, input: UpdateUserRoleInput) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role: input.role },
      });

      return toPublicUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw createAppError(404, 'Resource not found or invalid input');
      }

      throw error;
    }
  },

  async updateUserStatus(userId: string, input: UpdateUserStatusInput) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: input.status },
      });

      return toPublicUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw createAppError(404, 'Resource not found or invalid input');
      }

      throw error;
    }
  },
};