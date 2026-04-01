import type { FinancialRecord } from '@prisma/client';

export const serializeRecord = (record: FinancialRecord) => {
  return {
    id: record.id,
    amount: record.amount.toString(),
    type: record.type,
    category: record.category,
    date: record.date,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    userId: record.userId,
  };
};