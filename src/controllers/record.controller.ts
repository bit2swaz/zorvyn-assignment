import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../types/auth';
import type { CreateRecordInput, ListRecordsQuery, UpdateRecordInput } from '../schemas/record.schema';
import { createRecordSchema, listRecordsQuerySchema, updateRecordSchema } from '../schemas/record.schema';
import { recordService } from '../services/record.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, type ErrorDetail } from '../utils/response';

interface AppError extends Error {
  statusCode?: number;
  details?: ErrorDetail[];
}

const createValidationError = (details: ErrorDetail[]): AppError => {
  const error = new Error('Resource not found or invalid input') as AppError;
  error.statusCode = 400;
  error.details = details;

  return error;
};

const mapIssuesToErrorDetails = (issues: Array<{ path: PropertyKey[]; message: string }>): ErrorDetail[] => {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
};

const getAuthenticatedUserId = (request: Request): string => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const userId = authenticatedRequest.user?.id;

  if (!userId) {
    const error = new Error('Unauthenticated or inactive user') as AppError;
    error.statusCode = 401;

    throw error;
  }

  return userId;
};

const getRecordIdParam = (request: Request): string => {
  const recordId = request.params.id;

  if (!recordId || Array.isArray(recordId)) {
    const error = new Error('Resource not found or invalid input') as AppError;
    error.statusCode = 400;

    throw error;
  }

  return recordId;
};

const parseListQuery = (request: Request): ListRecordsQuery => {
  const parsedQuery = listRecordsQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    throw createValidationError(mapIssuesToErrorDetails(parsedQuery.error.issues));
  }

  return parsedQuery.data;
};

export const createRecord = asyncHandler(async (request: Request, response: Response) => {
  const parsedBody = createRecordSchema.safeParse(request.body);

  if (!parsedBody.success) {
    throw createValidationError(mapIssuesToErrorDetails(parsedBody.error.issues));
  }

  const record = await recordService.createRecord(
    getAuthenticatedUserId(request),
    parsedBody.data as CreateRecordInput,
  );

  sendSuccess(response, {
    statusCode: 201,
    message: 'Operation successful',
    data: record,
  });
});

export const getRecords = asyncHandler(async (request: Request, response: Response) => {
  const result = await recordService.listRecords(parseListQuery(request));

  sendSuccess(response, {
    message: 'Operation successful',
    data: result.data,
    meta: result.meta,
  });
});

export const getRecordById = asyncHandler(async (request: Request, response: Response) => {
  const record = await recordService.getRecordById(getRecordIdParam(request));

  sendSuccess(response, {
    message: 'Operation successful',
    data: record,
  });
});

export const updateRecord = asyncHandler(async (request: Request, response: Response) => {
  const parsedBody = updateRecordSchema.safeParse(request.body);

  if (!parsedBody.success) {
    throw createValidationError(mapIssuesToErrorDetails(parsedBody.error.issues));
  }

  const record = await recordService.updateRecord(
    getRecordIdParam(request),
    parsedBody.data as UpdateRecordInput,
  );

  sendSuccess(response, {
    message: 'Operation successful',
    data: record,
  });
});

export const deleteRecord = asyncHandler(async (request: Request, response: Response) => {
  const record = await recordService.softDeleteRecord(getRecordIdParam(request));

  sendSuccess(response, {
    message: 'Operation successful',
    data: record,
  });
});