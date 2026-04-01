import type { Response } from 'express';

export interface ResponseMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

interface SuccessOptions<TData> {
  statusCode?: number;
  message: string;
  data: TData;
  meta?: ResponseMeta;
}

interface ErrorOptions {
  statusCode: number;
  message: string;
  error?: ErrorDetail[];
}

export const sendSuccess = <TData>(response: Response, options: SuccessOptions<TData>): Response => {
  const { statusCode = 200, message, data, meta } = options;

  return response.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
};

export const sendError = (response: Response, options: ErrorOptions): Response => {
  const { statusCode, message, error = [] } = options;

  return response.status(statusCode).json({
    success: false,
    message,
    error,
  });
};