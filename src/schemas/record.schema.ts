import { TransactionType } from '@prisma/client';
import { z } from 'zod';

const decimalInputSchema = z
  .union([z.number(), z.string().trim().min(1, 'Amount must be a positive number')])
  .refine((value) => Number(value) > 0, 'Amount must be a positive number')
  .transform((value) => String(value));

const isoDateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Date must be a valid ISO datetime string')
  .transform((value) => new Date(value));

export const createRecordSchema = z.strictObject({
  amount: decimalInputSchema,
  type: z.enum(TransactionType),
  category: z.string().trim().min(1, 'Category is required'),
  date: isoDateStringSchema,
  notes: z.string().trim().min(1, 'Notes must not be empty').optional(),
});

export const updateRecordSchema = createRecordSchema;

export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100').optional().default(10),
  startDate: isoDateStringSchema.optional(),
  endDate: isoDateStringSchema.optional(),
  category: z.string().trim().min(1).optional(),
  type: z.enum(TransactionType).optional(),
  q: z.string().trim().min(1).optional(),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;