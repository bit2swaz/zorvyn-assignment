import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, PrismaClient, Role, Status, TransactionType } from '@prisma/client';
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

const createRecord = async (overrides: {
  userId: string;
  amount: Prisma.Decimal | number | string;
  type: TransactionType;
  category: string;
  date: Date;
  notes?: string | null;
  deletedAt?: Date | null;
}) => {
  return prisma.financialRecord.create({
    data: {
      userId: overrides.userId,
      amount: overrides.amount,
      type: overrides.type,
      category: overrides.category,
      date: overrides.date,
      notes: overrides.notes ?? null,
      deletedAt: overrides.deletedAt ?? null,
    },
  });
};

const signToken = (userId: string): string => {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '1h' });
};

const authHeader = (userId: string) => ({
  Authorization: `Bearer ${signToken(userId)}`,
});

describe('dashboard summary', () => {
  beforeEach(async () => {
    await prisma.financialRecord.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows ADMIN, ANALYST, and VIEWER to fetch the dashboard summary', async () => {
    const admin = await createUser({
      email: 'dashboard.admin@example.com',
      role: Role.ADMIN,
    });
    const analyst = await createUser({
      email: 'dashboard.analyst@example.com',
      role: Role.ANALYST,
    });
    const viewer = await createUser({
      email: 'dashboard.viewer@example.com',
      role: Role.VIEWER,
    });

    await createRecord({
      userId: admin.id,
      amount: '1000.00',
      type: TransactionType.INCOME,
      category: 'salary',
      date: new Date('2026-01-05T00:00:00.000Z'),
      notes: 'January salary',
    });
    await createRecord({
      userId: admin.id,
      amount: '200.00',
      type: TransactionType.EXPENSE,
      category: 'groceries',
      date: new Date('2026-01-12T00:00:00.000Z'),
      notes: 'Weekly groceries',
    });
    await createRecord({
      userId: analyst.id,
      amount: '500.00',
      type: TransactionType.INCOME,
      category: 'consulting',
      date: new Date('2026-02-03T00:00:00.000Z'),
      notes: 'Client retainer',
    });
    await createRecord({
      userId: analyst.id,
      amount: '150.00',
      type: TransactionType.EXPENSE,
      category: 'travel',
      date: new Date('2026-02-16T00:00:00.000Z'),
      notes: 'Airport taxi',
    });
    await createRecord({
      userId: viewer.id,
      amount: '1200.00',
      type: TransactionType.INCOME,
      category: 'salary',
      date: new Date('2026-03-02T00:00:00.000Z'),
      notes: 'March salary',
    });
    await createRecord({
      userId: viewer.id,
      amount: '300.00',
      type: TransactionType.EXPENSE,
      category: 'servers',
      date: new Date('2026-03-20T00:00:00.000Z'),
      notes: 'Cloud hosting bill',
    });
    await createRecord({
      userId: admin.id,
      amount: '999.00',
      type: TransactionType.EXPENSE,
      category: 'hidden',
      date: new Date('2026-02-10T00:00:00.000Z'),
      notes: 'Deleted record should be ignored',
      deletedAt: new Date('2026-02-11T00:00:00.000Z'),
    });

    const adminResponse = await request(app)
      .get('/api/v1/dashboard/summary')
      .set(authHeader(admin.id));
    const analystResponse = await request(app)
      .get('/api/v1/dashboard/summary')
      .set(authHeader(analyst.id));
    const viewerResponse = await request(app)
      .get('/api/v1/dashboard/summary')
      .set(authHeader(viewer.id));

    for (const response of [adminResponse, analystResponse, viewerResponse]) {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Operation successful');
      expect(response.body.data).toEqual({
        totalIncome: '2700',
        totalExpenses: '650',
        netBalance: '2050',
        categoryTotals: [
          { category: 'salary', amount: '2200' },
          { category: 'consulting', amount: '500' },
          { category: 'servers', amount: '300' },
          { category: 'groceries', amount: '200' },
          { category: 'travel', amount: '150' },
        ],
        recentActivity: [
          expect.objectContaining({
            category: 'servers',
            amount: '300',
            notes: 'Cloud hosting bill',
          }),
          expect.objectContaining({
            category: 'salary',
            amount: '1200',
            notes: 'March salary',
          }),
          expect.objectContaining({
            category: 'travel',
            amount: '150',
            notes: 'Airport taxi',
          }),
          expect.objectContaining({
            category: 'consulting',
            amount: '500',
            notes: 'Client retainer',
          }),
          expect.objectContaining({
            category: 'groceries',
            amount: '200',
            notes: 'Weekly groceries',
          }),
        ],
        trends: [
          { period: '2026-01', income: '1000', expenses: '200' },
          { period: '2026-02', income: '500', expenses: '150' },
          { period: '2026-03', income: '1200', expenses: '300' },
        ],
      });
    }
  });

  it('rejects unauthenticated requests for the dashboard summary', async () => {
    const response = await request(app).get('/api/v1/dashboard/summary');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthenticated or inactive user',
      error: [],
    });
  });
});
