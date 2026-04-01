import { z } from 'zod';

export const registerSchema = z.strictObject({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.email('Email must be valid').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const loginSchema = z.strictObject({
  email: z.email('Email must be valid').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;