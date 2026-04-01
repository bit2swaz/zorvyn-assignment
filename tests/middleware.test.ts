import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import request from 'supertest';

import { errorHandler } from '../src/middlewares/errorHandler';
import { asyncHandler } from '../src/utils/asyncHandler';
import { sendError, sendSuccess } from '../src/utils/response';

describe('middleware utilities', () => {
  const buildApp = (): express.Express => {
    const testApp = express();

    testApp.use(express.json());

    testApp.get('/success', (_request: Request, response: Response) => {
      sendSuccess(response, {
        message: 'Operation successful',
        data: { key: 'value' },
      });
    });

    testApp.get('/success-with-meta', (_request: Request, response: Response) => {
      sendSuccess(response, {
        message: 'Operation successful',
        data: [{ id: 'record-1' }],
        meta: {
          page: 1,
          limit: 10,
          total: 42,
        },
      });
    });

    testApp.get(
      '/async-error',
      asyncHandler(async () => {
        const error = new Error('Resource not found or invalid input') as Error & {
          statusCode?: number;
          details?: Array<{ field: string; message: string }>;
        };

        error.statusCode = 404;
        error.details = [{ field: 'general', message: 'Missing resource' }];

        throw error;
      }),
    );

    testApp.get('/handled-error', (_request: Request, response: Response) => {
      sendError(response, {
        statusCode: 400,
        message: 'Resource not found or invalid input',
        error: [{ field: 'amount', message: 'Amount must be a positive number' }],
      });
    });

    testApp.get('/sync-error', (_request: Request, _response: Response, next: NextFunction) => {
      const error = new Error('Server Error Catch-All') as Error & { statusCode?: number };
      error.statusCode = 500;
      next(error);
    });

    testApp.use(errorHandler);

    return testApp;
  };

  it('returns the SSOT success envelope without meta', async () => {
    const response = await request(buildApp()).get('/success');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Operation successful',
      data: { key: 'value' },
    });
  });

  it('returns the SSOT success envelope with meta for paginated responses', async () => {
    const response = await request(buildApp()).get('/success-with-meta');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Operation successful',
      data: [{ id: 'record-1' }],
      meta: {
        page: 1,
        limit: 10,
        total: 42,
      },
    });
  });

  it('passes async route errors to the global handler with the SSOT error envelope', async () => {
    const response = await request(buildApp()).get('/async-error');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Resource not found or invalid input',
      error: [{ field: 'general', message: 'Missing resource' }],
    });
  });

  it('returns the SSOT error envelope for explicit error responses', async () => {
    const response = await request(buildApp()).get('/handled-error');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Resource not found or invalid input',
      error: [{ field: 'amount', message: 'Amount must be a positive number' }],
    });
  });

  it('maps uncaught errors to the catch-all error response shape', async () => {
    const response = await request(buildApp()).get('/sync-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server Error Catch-All',
      error: [],
    });
  });
});
