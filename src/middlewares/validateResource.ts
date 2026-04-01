import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { sendError, type ErrorDetail } from '../utils/response';

const mapIssuesToErrorDetails = (issues: Array<{ path: PropertyKey[]; message: string }>): ErrorDetail[] => {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
};

export const validateResource = <TOutput>(schema: ZodType<TOutput>): RequestHandler => {
  return (request, response, next): void => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      sendError(response, {
        statusCode: 400,
        message: 'Resource not found or invalid input',
        error: mapIssuesToErrorDetails(result.error.issues),
      });

      return;
    }

    request.body = result.data;
    next();
  };
};