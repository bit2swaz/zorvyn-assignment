import request from 'supertest';

import { app } from '../src/app';

jest.setTimeout(30000);

describe('application surface', () => {
  it('returns the standard success envelope for the health endpoint', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Finance backend is running.',
      data: {
        status: 'ok',
      },
    });
  });

  it('serves Swagger UI at /api/v1/api-docs', async () => {
    const response = await request(app).get('/api/v1/api-docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Swagger UI');
  });

  it('serves the raw OpenAPI spec for public Swagger tooling', async () => {
    const response = await request(app).get('/api/v1/openapi.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual(
      expect.objectContaining({
        openapi: '3.0.0',
        info: expect.objectContaining({
          title: 'Zorvyn Finance Backend API',
        }),
      }),
    );
  });

  it('enforces the auth-specific rate limit after 10 requests in 15 minutes', async () => {
    let finalResponse;

    for (let attempt = 0; attempt < 11; attempt += 1) {
      finalResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: '' });
    }

    expect(finalResponse?.status).toBe(429);
    expect(finalResponse?.body).toEqual({
      success: false,
      message: 'Too many requests',
      error: [],
    });
  });

  it('enforces the global rate limit after 100 requests in 15 minutes', async () => {
    let finalResponse;

    for (let attempt = 0; attempt < 101; attempt += 1) {
      finalResponse = await request(app).get('/api/v1/health');
    }

    expect(finalResponse?.status).toBe(429);
    expect(finalResponse?.body).toEqual({
      success: false,
      message: 'Too many requests',
      error: [],
    });
  });
});