import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, Status } from '@prisma/client';
import request from 'supertest';

import { app } from '../src/app';
import { env } from '../src/config/env';

const prisma = new PrismaClient();
const password = 'Password123!';

jest.setTimeout(30000);

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

const authHeader = (userId: string) => ({
  Authorization: `Bearer ${signToken(userId)}`,
});

describe('user management', () => {
  beforeEach(async () => {
    await prisma.financialRecord.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects ANALYST access to all /api/v1/users routes', async () => {
    const analyst = await createUser({
      email: 'analyst@example.com',
      role: Role.ANALYST,
    });
    const targetUser = await createUser({
      email: 'target.analyst@example.com',
    });

    const responses = [
      await request(app).get('/api/v1/users').set(authHeader(analyst.id)),
      await request(app)
        .post('/api/v1/users')
        .set(authHeader(analyst.id))
        .send({
          name: 'Created By Analyst',
          email: 'created.by.analyst@example.com',
          password,
          role: 'VIEWER',
          status: 'ACTIVE',
        }),
      await request(app)
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set(authHeader(analyst.id))
        .send({ role: 'ADMIN' }),
      await request(app)
        .patch(`/api/v1/users/${targetUser.id}/status`)
        .set(authHeader(analyst.id))
        .send({ status: 'INACTIVE' }),
    ];

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: 'Forbidden',
        error: [],
      });
    }
  });

  it('rejects VIEWER access to all /api/v1/users routes', async () => {
    const viewer = await createUser({
      email: 'viewer@example.com',
      role: Role.VIEWER,
    });
    const targetUser = await createUser({
      email: 'target.viewer@example.com',
    });

    const responses = [
      await request(app).get('/api/v1/users').set(authHeader(viewer.id)),
      await request(app)
        .post('/api/v1/users')
        .set(authHeader(viewer.id))
        .send({
          name: 'Created By Viewer',
          email: 'created.by.viewer@example.com',
          password,
          role: 'VIEWER',
          status: 'ACTIVE',
        }),
      await request(app)
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set(authHeader(viewer.id))
        .send({ role: 'ADMIN' }),
      await request(app)
        .patch(`/api/v1/users/${targetUser.id}/status`)
        .set(authHeader(viewer.id))
        .send({ status: 'INACTIVE' }),
    ];

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: 'Forbidden',
        error: [],
      });
    }
  });

  it('allows an ADMIN to list all users', async () => {
    const admin = await createUser({
      email: 'admin.list@example.com',
      role: Role.ADMIN,
    });
    await createUser({
      name: 'Analyst User',
      email: 'analyst.list@example.com',
      role: Role.ANALYST,
    });
    await createUser({
      name: 'Viewer User',
      email: 'viewer.list@example.com',
      role: Role.VIEWER,
    });

    const response = await request(app).get('/api/v1/users').set(authHeader(admin.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Operation successful');
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'admin.list@example.com', role: 'ADMIN' }),
        expect.objectContaining({ email: 'analyst.list@example.com', role: 'ANALYST' }),
        expect.objectContaining({ email: 'viewer.list@example.com', role: 'VIEWER' }),
      ]),
    );
    expect(response.body.data).toHaveLength(3);
  });

  it('allows an ADMIN to create a user directly', async () => {
    const admin = await createUser({
      email: 'admin.create@example.com',
      role: Role.ADMIN,
    });

    const response = await request(app)
      .post('/api/v1/users')
      .set(authHeader(admin.id))
      .send({
        name: 'Created User',
        email: 'created.user@example.com',
        password,
        role: 'ANALYST',
        status: 'INACTIVE',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Operation successful');
    expect(response.body.data).toMatchObject({
      name: 'Created User',
      email: 'created.user@example.com',
      role: 'ANALYST',
      status: 'INACTIVE',
    });

    const createdUser = await prisma.user.findUnique({
      where: { email: 'created.user@example.com' },
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser?.role).toBe(Role.ANALYST);
    expect(createdUser?.status).toBe(Status.INACTIVE);
    expect(createdUser?.passwordHash).not.toBe(password);
  });

  it('allows an ADMIN to update a user role', async () => {
    const admin = await createUser({
      email: 'admin.role@example.com',
      role: Role.ADMIN,
    });
    const targetUser = await createUser({
      email: 'role.target@example.com',
      role: Role.VIEWER,
    });

    const response = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/role`)
      .set(authHeader(admin.id))
      .send({ role: 'ANALYST' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Operation successful',
      data: expect.objectContaining({
        id: targetUser.id,
        email: 'role.target@example.com',
        role: 'ANALYST',
      }),
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUser.id },
    });

    expect(updatedUser?.role).toBe(Role.ANALYST);
  });

  it('allows an ADMIN to update a user status', async () => {
    const admin = await createUser({
      email: 'admin.status@example.com',
      role: Role.ADMIN,
    });
    const targetUser = await createUser({
      email: 'status.target@example.com',
      status: Status.ACTIVE,
    });

    const response = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/status`)
      .set(authHeader(admin.id))
      .send({ status: 'INACTIVE' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Operation successful',
      data: expect.objectContaining({
        id: targetUser.id,
        email: 'status.target@example.com',
        status: 'INACTIVE',
      }),
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUser.id },
    });

    expect(updatedUser?.status).toBe(Status.INACTIVE);
  });
});
