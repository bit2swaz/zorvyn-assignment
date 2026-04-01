import type { ErrorRequestHandler } from 'express';

import { sendError, type ErrorDetail } from '../utils/response';

interface AppError extends Error {
  statusCode?: number;
  status?: number;
  details?: ErrorDetail[];
  error?: ErrorDetail[];
}

const defaultMessages: Record<number, string> = {
  400: 'Resource not found or invalid input',
  401: 'Unauthenticated or inactive user',
  403: 'Forbidden',
  404: 'Resource not found or invalid input',
  429: 'Too many requests',
  500: 'Server Error Catch-All',
};

const resolveStatusCode = (error: AppError): number => {
  const candidate = error.statusCode ?? error.status ?? 500;

  return [400, 401, 403, 404, 429, 500].includes(candidate) ? candidate : 500;
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const appError = error as AppError;
  const statusCode = resolveStatusCode(appError);
  const fallbackMessage = defaultMessages[statusCode] ?? 'Server Error Catch-All';
  const message: string = appError.message || fallbackMessage;
  const details = appError.details ?? appError.error ?? [];

  sendError(response, {
    statusCode,
    message,
    error: details,
  });
};