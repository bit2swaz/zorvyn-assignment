import bcrypt from 'bcryptjs';
import express, { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, Status } from '@prisma/client';
import request from 'supertest';

import { app } from '../src/app';
import { env } from '../src/config/env';
import { errorHandler } from '../src/middlewares/errorHandler';
import { requireAuth } from '../src/middlewares/requireAuth';
import { requireRole } from '../src/middlewares/requireRole';
import type { AuthenticatedRequest } from '../src/types/auth';
import { sendSuccess } from '../src/utils/response';

const prisma = new PrismaClient();
const password = 'Password123!';

const createUser = async (overrides?: {
  name?: string;
  email?: string;
  passwordHash?: string;
  role?: Role;
  status?: Status;
}) => {
  return prisma.user.create({
    data: {
      name: overrides?.name ?? 'Test User',
      email: overrides?.email ?? `user-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: overrides?.passwordHash ?? (await bcrypt.hash(password, 10)),
      role: overrides?.role ?? Role.VIEWER,
      status: overrides?.status ?? Status.ACTIVE,
    },
  });
};

const signToken = (userId: string): string => {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '1h' });
};

const buildProtectedApp = (): express.Express => {
  const protectedApp = express();

  protectedApp.get('/protected', requireAuth, (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    sendSuccess(response, {
      message: 'Operation successful',
      data: {
        userId: authenticatedRequest.user?.id,
        role: authenticatedRequest.user?.role,
      },
    });
  });

  protectedApp.get(
    '/admin-only',
    requireAuth,
    requireRole([Role.ADMIN]),
    (_request: Request, response: Response) => {
      sendSuccess(response, {
        message: 'Operation successful',
        data: { allowed: true },
      });
    },
  );

  protectedApp.use(errorHandler);

  return protectedApp;
};

describe('authentication and RBAC', () => {
  beforeEach(async () => {
    await prisma.financialRecord.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers a new viewer user through POST /api/v1/auth/register', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Viewer',
      email: 'alice.viewer@example.com',
      password,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Operation successful');
    expect(response.body.data).toMatchObject({
      name: 'Alice Viewer',
      email: 'alice.viewer@example.com',
      role: 'VIEWER',
      status: 'ACTIVE',
    });

    const createdUser = await prisma.user.findUnique({
      where: { email: 'alice.viewer@example.com' },
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser?.role).toBe(Role.VIEWER);
    expect(createdUser?.status).toBe(Status.ACTIVE);
    expect(createdUser?.passwordHash).not.toBe(password);
  });

  it('rejects duplicate emails during registration', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Viewer',
      email: 'duplicate@example.com',
      password,
    });

    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Another Alice',
      email: 'duplicate@example.com',
      password,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Resource not found or invalid input',
      error: [{ field: 'email', message: 'Email already exists' }],
    });
  });

  it('logs in an active user and returns a JWT', async () => {
    await createUser({
      name: 'Active User',
      email: 'active.user@example.com',
      role: Role.VIEWER,
      status: Status.ACTIVE,
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'active.user@example.com',
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Operation successful');
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it('rejects invalid credentials during login', async () => {
    await createUser({
      email: 'invalid.credentials@example.com',
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'invalid.credentials@example.com',
      password: 'WrongPassword123!',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthenticated or inactive user',
      error: [],
    });
  });

  it('prevents inactive users from logging in', async () => {
    await createUser({
      email: 'inactive.user@example.com',
      status: Status.INACTIVE,
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'inactive.user@example.com',
      password,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthenticated or inactive user',
      error: [],
    });
  });

  it('rejects requests without a token in the auth guard', async () => {
    const response = await request(buildProtectedApp()).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthenticated or inactive user',
      error: [],
    });
  });

  it('rejects inactive users in the auth guard even with a valid token', async () => {
    const inactiveUser = await createUser({
      email: 'inactive.guard@example.com',
      status: Status.INACTIVE,
    });

    const response = await request(buildProtectedApp())
      .get('/protected')
      .set('Authorization', `Bearer ${signToken(inactiveUser.id)}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthenticated or inactive user',
      error: [],
    });
  });

  it('rejects viewer access to admin-only routes and allows admin access', async () => {
    const viewer = await createUser({
      email: 'viewer.role@example.com',
      role: Role.VIEWER,
    });
    const admin = await createUser({
      email: 'admin.role@example.com',
      role: Role.ADMIN,
    });

    const viewerResponse = await request(buildProtectedApp())
      .get('/admin-only')
      .set('Authorization', `Bearer ${signToken(viewer.id)}`);

    expect(viewerResponse.status).toBe(403);
    expect(viewerResponse.body).toEqual({
      success: false,
      message: 'Forbidden',
      error: [],
    });

    const adminResponse = await request(buildProtectedApp())
      .get('/admin-only')
      .set('Authorization', `Bearer ${signToken(admin.id)}`);

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body).toEqual({
      success: true,
      message: 'Operation successful',
      data: { allowed: true },
    });
  });
});
