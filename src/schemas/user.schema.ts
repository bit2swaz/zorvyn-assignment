import { Role, Status } from '@prisma/client';
import { z } from 'zod';

export const createUserSchema = z.strictObject({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.email('Email must be valid').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(Role),
  status: z.enum(Status),
});

export const updateUserRoleSchema = z.strictObject({
  role: z.enum(Role),
});

export const updateUserStatusSchema = z.strictObject({
  status: z.enum(Status),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;