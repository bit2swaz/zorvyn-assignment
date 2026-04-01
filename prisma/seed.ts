import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { PrismaClient, Role, Status, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const categoriesByType: Record<TransactionType, string[]> = {
  INCOME: ['salary', 'consulting', 'bonus', 'refund', 'investment'],
  EXPENSE: ['groceries', 'travel', 'rent', 'servers', 'equipment', 'utilities', 'training'],
};

const noteTemplates: Record<TransactionType, string[]> = {
  INCOME: [
    'Monthly payout received',
    'Client invoice settled',
    'Quarterly bonus deposited',
    'Refund processed successfully',
    'Investment proceeds booked',
  ],
  EXPENSE: [
    'Household essentials purchase',
    'Business trip expense',
    'Recurring operating cost',
    'Cloud infrastructure invoice',
    'Equipment replacement order',
    'Utility payment completed',
    'Course and certification cost',
  ],
};

const buildSeedRecords = (userIds: string[]) => {
  const records: Array<{
    amount: string;
    type: TransactionType;
    category: string;
    date: Date;
    notes: string;
    userId: string;
  }> = [];

  const baseDates = [
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-02-01T00:00:00.000Z'),
    new Date('2026-03-01T00:00:00.000Z'),
  ];

  for (let monthIndex = 0; monthIndex < baseDates.length; monthIndex += 1) {
    const monthStart = baseDates[monthIndex];

    if (!monthStart) {
      continue;
    }

    for (let recordIndex = 0; recordIndex < 18; recordIndex += 1) {
      const type = recordIndex % 3 === 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
      const categoryPool = categoriesByType[type];
      const notePool = noteTemplates[type];
      const category = categoryPool[(recordIndex + monthIndex) % categoryPool.length];
      const note = notePool[(recordIndex + monthIndex) % notePool.length];
      const userId = userIds[(recordIndex + monthIndex) % userIds.length];

      if (!category || !note || !userId) {
        continue;
      }

      const day = ((recordIndex * 2 + monthIndex) % 27) + 1;
      const amountBase = type === TransactionType.INCOME ? 850 + monthIndex * 120 + recordIndex * 17 : 35 + monthIndex * 11 + recordIndex * 9;

      records.push({
        amount: amountBase.toFixed(2),
        type,
        category,
        date: new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day, 9, 30, 0)),
        notes: `${note} (${category})`,
        userId,
      });
    }
  }

  return records;
};

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "FinancialRecord", "User" CASCADE');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const [admin, analyst, viewer] = await prisma.$transaction([
    prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@zorvyn.local',
        passwordHash,
        role: Role.ADMIN,
        status: Status.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Analyst User',
        email: 'analyst@zorvyn.local',
        passwordHash,
        role: Role.ANALYST,
        status: Status.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Viewer User',
        email: 'viewer@zorvyn.local',
        passwordHash,
        role: Role.VIEWER,
        status: Status.ACTIVE,
      },
    }),
  ]);

  const records = buildSeedRecords([admin.id, analyst.id, viewer.id]);

  await prisma.financialRecord.createMany({
    data: records,
  });

  process.stdout.write(`Seeded ${records.length} financial records across 3 users.\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });