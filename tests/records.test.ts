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
  amount?: Prisma.Decimal | number | string;
  type?: TransactionType;
  category?: string;
  date?: Date;
  notes?: string | null;
  deletedAt?: Date | null;
}) => {
  return prisma.financialRecord.create({
    data: {
      userId: overrides.userId,
      amount: overrides.amount ?? new Prisma.Decimal('100.00'),
      type: overrides.type ?? TransactionType.EXPENSE,
      category: overrides.category ?? 'groceries',
      date: overrides.date ?? new Date('2026-01-15T10:00:00.000Z'),
      notes: overrides.notes ?? 'Default note',
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

describe('financial records', () => {
  beforeEach(async () => {
    await prisma.financialRecord.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows an ADMIN to create a record', async () => {
    const admin = await createUser({
      email: 'records.admin.create@example.com',
      role: Role.ADMIN,
    });

    const response = await request(app)
      .post('/api/v1/records')
      .set(authHeader(admin.id))
      .send({
        amount: 1250.75,
        type: 'INCOME',
        category: 'salary',
        date: '2026-02-01T00:00:00.000Z',
        notes: 'Monthly Salary',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: 'Operation successful',
      data: expect.objectContaining({
        amount: '1250.75',
        type: 'INCOME',
        category: 'salary',
        notes: 'Monthly Salary',
        userId: admin.id,
      }),
    });

    const createdRecord = await prisma.financialRecord.findFirst({
      where: { userId: admin.id, category: 'salary' },
    });

    expect(createdRecord).not.toBeNull();
    expect(createdRecord?.amount.toString()).toBe('1250.75');
    expect(createdRecord?.type).toBe(TransactionType.INCOME);
  });

  it('rejects ANALYST and VIEWER attempts to create records', async () => {
    const analyst = await createUser({
      email: 'records.analyst.create@example.com',
      role: Role.ANALYST,
    });
    const viewer = await createUser({
      email: 'records.viewer.create@example.com',
      role: Role.VIEWER,
    });

    const responses = [
      await request(app)
        .post('/api/v1/records')
        .set(authHeader(analyst.id))
        .send({
          amount: 50,
          type: 'EXPENSE',
          category: 'coffee',
          date: '2026-02-05T00:00:00.000Z',
        }),
      await request(app)
        .post('/api/v1/records')
        .set(authHeader(viewer.id))
        .send({
          amount: 50,
          type: 'EXPENSE',
          category: 'coffee',
          date: '2026-02-05T00:00:00.000Z',
        }),
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

  it('allows ADMIN and ANALYST to fetch paginated records while blocking VIEWER', async () => {
    const admin = await createUser({
      email: 'records.admin.list@example.com',
      role: Role.ADMIN,
    });
    const analyst = await createUser({
      email: 'records.analyst.list@example.com',
      role: Role.ANALYST,
    });
    const viewer = await createUser({
      email: 'records.viewer.list@example.com',
      role: Role.VIEWER,
    });

    for (let index = 0; index < 12; index += 1) {
      await createRecord({
        userId: admin.id,
        amount: new Prisma.Decimal((index + 1).toFixed(2)),
        type: index % 2 === 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
        category: `category-${index}`,
        date: new Date(`2026-02-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
        notes: `note-${index}`,
      });
    }

    const adminResponse = await request(app)
      .get('/api/v1/records?page=2&limit=5')
      .set(authHeader(admin.id));
    const analystResponse = await request(app)
      .get('/api/v1/records?page=2&limit=5')
      .set(authHeader(analyst.id));
    const viewerResponse = await request(app).get('/api/v1/records').set(authHeader(viewer.id));

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.success).toBe(true);
    expect(adminResponse.body.message).toBe('Operation successful');
    expect(adminResponse.body.data).toHaveLength(5);
    expect(adminResponse.body.meta).toEqual({
      page: 2,
      limit: 5,
      total: 12,
    });
    expect(adminResponse.body.data[0]).toEqual(
      expect.objectContaining({
        amount: expect.any(String),
        category: expect.any(String),
      }),
    );

    expect(analystResponse.status).toBe(200);
    expect(analystResponse.body.meta).toEqual({
      page: 2,
      limit: 5,
      total: 12,
    });

    expect(viewerResponse.status).toBe(403);
    expect(viewerResponse.body).toEqual({
      success: false,
      message: 'Forbidden',
      error: [],
    });
  });

  it('filters records by date range, category, and type', async () => {
    const admin = await createUser({
      email: 'records.admin.filters@example.com',
      role: Role.ADMIN,
    });

    await createRecord({
      userId: admin.id,
      amount: '100.00',
      type: TransactionType.INCOME,
      category: 'salary',
      date: new Date('2026-01-10T00:00:00.000Z'),
      notes: 'January salary',
    });
    await createRecord({
      userId: admin.id,
      amount: '75.25',
      type: TransactionType.EXPENSE,
      category: 'groceries',
      date: new Date('2026-02-10T00:00:00.000Z'),
      notes: 'Weekly groceries',
    });
    await createRecord({
      userId: admin.id,
      amount: '25.00',
      type: TransactionType.EXPENSE,
      category: 'transport',
      date: new Date('2026-03-10T00:00:00.000Z'),
      notes: 'Bus card reload',
    });

    const dateAndTypeResponse = await request(app)
      .get(
        '/api/v1/records?startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-28T23:59:59.999Z&type=EXPENSE',
      )
      .set(authHeader(admin.id));

    expect(dateAndTypeResponse.status).toBe(200);
    expect(dateAndTypeResponse.body.data).toHaveLength(1);
    expect(dateAndTypeResponse.body.data[0]).toEqual(
      expect.objectContaining({
        category: 'groceries',
        type: 'EXPENSE',
        amount: '75.25',
      }),
    );

    const categoryResponse = await request(app)
      .get('/api/v1/records?category=salary')
      .set(authHeader(admin.id));

    expect(categoryResponse.status).toBe(200);
    expect(categoryResponse.body.data).toHaveLength(1);
    expect(categoryResponse.body.data[0]).toEqual(
      expect.objectContaining({
        category: 'salary',
        type: 'INCOME',
      }),
    );
  });

  it('searches records case-insensitively across category and notes', async () => {
    const analyst = await createUser({
      email: 'records.analyst.search@example.com',
      role: Role.ANALYST,
    });

    await createRecord({
      userId: analyst.id,
      amount: '10.00',
      type: TransactionType.EXPENSE,
      category: 'Travel',
      date: new Date('2026-02-18T00:00:00.000Z'),
      notes: 'Airport Taxi',
    });
    await createRecord({
      userId: analyst.id,
      amount: '12.50',
      type: TransactionType.EXPENSE,
      category: 'food',
      date: new Date('2026-02-19T00:00:00.000Z'),
      notes: 'Lunch with team',
    });

    const categorySearchResponse = await request(app)
      .get('/api/v1/records?q=travel')
      .set(authHeader(analyst.id));
    const notesSearchResponse = await request(app)
      .get('/api/v1/records?q=airport')
      .set(authHeader(analyst.id));

    expect(categorySearchResponse.status).toBe(200);
    expect(categorySearchResponse.body.data).toHaveLength(1);
    expect(categorySearchResponse.body.data[0]).toEqual(
      expect.objectContaining({
        category: 'Travel',
      }),
    );

    expect(notesSearchResponse.status).toBe(200);
    expect(notesSearchResponse.body.data).toHaveLength(1);
    expect(notesSearchResponse.body.data[0]).toEqual(
      expect.objectContaining({
        notes: 'Airport Taxi',
      }),
    );
  });

  it('never returns records where deletedAt is set', async () => {
    const admin = await createUser({
      email: 'records.admin.deleted@example.com',
      role: Role.ADMIN,
    });

    const visibleRecord = await createRecord({
      userId: admin.id,
      amount: '300.00',
      type: TransactionType.INCOME,
      category: 'consulting',
      date: new Date('2026-02-20T00:00:00.000Z'),
      notes: 'Visible income',
    });
    const deletedRecord = await createRecord({
      userId: admin.id,
      amount: '45.00',
      type: TransactionType.EXPENSE,
      category: 'hidden',
      date: new Date('2026-02-21T00:00:00.000Z'),
      notes: 'Hidden expense',
      deletedAt: new Date('2026-02-22T00:00:00.000Z'),
    });

    const listResponse = await request(app).get('/api/v1/records').set(authHeader(admin.id));
    const detailResponse = await request(app)
      .get(`/api/v1/records/${visibleRecord.id}`)
      .set(authHeader(admin.id));
    const deletedDetailResponse = await request(app)
      .get(`/api/v1/records/${deletedRecord.id}`)
      .set(authHeader(admin.id));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual([
      expect.objectContaining({
        id: visibleRecord.id,
        category: 'consulting',
      }),
    ]);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data).toEqual(
      expect.objectContaining({
        id: visibleRecord.id,
        category: 'consulting',
      }),
    );

    expect(deletedDetailResponse.status).toBe(404);
    expect(deletedDetailResponse.body).toEqual({
      success: false,
      message: 'Resource not found or invalid input',
      error: [],
    });
  });
});
