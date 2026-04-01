import 'dotenv/config';

import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
        'DATABASE_URL must be a valid PostgreSQL connection string',
      ),
    PORT: z.coerce
      .number()
      .int('PORT must be an integer')
      .min(1, 'PORT must be greater than 0')
      .max(65535, 'PORT must be less than or equal to 65535'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  })
  .strict();

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'environment';

      return `${path}: ${issue.message}`;
    })
    .join('; ');

  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsedEnv.data;

export type Env = typeof env;