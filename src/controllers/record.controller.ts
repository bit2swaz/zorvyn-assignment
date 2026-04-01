import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../types/auth';
import type { CreateRecordInput, ListRecordsQuery, UpdateRecordInput } from '../schemas/record.schema';
import { createRecordSchema, listRecordsQuerySchema, updateRecordSchema } from '../schemas/record.schema';
import { recordService } from '../services/record.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, type ErrorDetail } from '../utils/response';

/**
 * @openapi
 * /api/v1/records:
 *   post:
 *     tags:
 *       - Records
 *     summary: Create a financial record
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Record created successfully.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 *   get:
 *     tags:
 *       - Records
 *     summary: List records with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INCOME, EXPENSE]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Records returned successfully.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 * /api/v1/records/{id}:
 *   get:
 *     tags:
 *       - Records
 *     summary: Get a single record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record returned successfully.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Record not found.
 *   put:
 *     tags:
 *       - Records
 *     summary: Fully update a record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record updated successfully.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Record not found.
 *   delete:
 *     tags:
 *       - Records
 *     summary: Soft delete a record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record soft deleted successfully.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Record not found.
 */

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