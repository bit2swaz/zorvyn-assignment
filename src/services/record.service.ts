import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import type { CreateRecordInput, ListRecordsQuery } from '../schemas/record.schema';
import { serializeRecord } from '../utils/record';

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

const buildRecordsWhereInput = (query: ListRecordsQuery): Prisma.FinancialRecordWhereInput => {
  const dateFilters: Prisma.DateTimeFilter = {};

  if (query.startDate) {
    dateFilters.gte = query.startDate;
  }

  if (query.endDate) {
    dateFilters.lte = query.endDate;
  }

  return {
    deletedAt: null,
    ...(query.category ? { category: query.category } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.startDate || query.endDate ? { date: dateFilters } : {}),
    ...(query.q
      ? {
          OR: [
            { category: { contains: query.q, mode: 'insensitive' } },
            { notes: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
};

export const recordService = {
  async createRecord(userId: string, input: CreateRecordInput) {
    const record = await prisma.financialRecord.create({
      data: {
        amount: new Prisma.Decimal(input.amount),
        type: input.type,
        category: input.category,
        date: input.date,
        notes: input.notes ?? null,
        userId,
      },
    });

    return serializeRecord(record);
  },

  async listRecords(query: ListRecordsQuery) {
    const where = buildRecordsWhereInput(query);
    const skip = (query.page - 1) * query.limit;

    const [records, total] = await prisma.$transaction([
      prisma.financialRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.financialRecord.count({ where }),
    ]);

    return {
      data: records.map(serializeRecord),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  },

  async getRecordById(recordId: string) {
    const record = await prisma.financialRecord.findFirst({
      where: {
        id: recordId,
        deletedAt: null,
      },
    });

    if (!record) {
      throw createAppError(404, 'Resource not found or invalid input');
    }

    return serializeRecord(record);
  },
};