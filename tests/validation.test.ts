import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { z } from 'zod';

import { errorHandler } from '../src/middlewares/errorHandler';
import { validateResource } from '../src/middlewares/validateResource';
import { sendSuccess } from '../src/utils/response';

describe('validateResource middleware', () => {
  const payloadSchema = z.strictObject({
    name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
    amount: z.number().positive('Amount must be a positive number'),
  });

  const buildApp = (): express.Express => {
    const testApp = express();

    testApp.use(express.json());

    testApp.post(
      '/validate',
      validateResource(payloadSchema),
      (request: Request, response: Response) => {
        sendSuccess(response, {
          message: 'Operation successful',
          data: request.body,
        });
      },
    );

    testApp.use(errorHandler);

    return testApp;
  };

  it('returns HTTP 400 with the standard error envelope for invalid payloads', async () => {
    const response = await request(buildApp())
      .post('/validate')
      .send({ name: '', amount: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Resource not found or invalid input',
      error: [
        { field: 'name', message: 'Name must be at least 2 characters long' },
        { field: 'amount', message: 'Amount must be a positive number' },
      ],
    });
  });

  it('allows next() on valid payloads and forwards the parsed body', async () => {
    const response = await request(buildApp())
      .post('/validate')
      .send({ name: '  Alice  ', amount: 125.5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Operation successful',
      data: {
        name: 'Alice',
        amount: 125.5,
      },
    });
  });
});
