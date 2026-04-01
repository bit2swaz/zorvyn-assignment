import { Prisma, TransactionType } from '@prisma/client';

import { prisma } from '../config/prisma';
import { serializeRecord } from '../utils/record';

type TrendRow = {
  period: string;
  income: Prisma.Decimal;
  expenses: Prisma.Decimal;
};

export const dashboardService = {
  async getSummary() {
    const activeRecordsWhere = { deletedAt: null };

    const [incomeAggregate, expenseAggregate, categoryTotals, recentActivity, trends] =
      await Promise.all([
        prisma.financialRecord.aggregate({
          where: {
            ...activeRecordsWhere,
            type: TransactionType.INCOME,
          },
          _sum: { amount: true },
        }),
        prisma.financialRecord.aggregate({
          where: {
            ...activeRecordsWhere,
            type: TransactionType.EXPENSE,
          },
          _sum: { amount: true },
        }),
        prisma.financialRecord.groupBy({
          by: ['category'],
          where: activeRecordsWhere,
          _sum: { amount: true },
        }),
        prisma.financialRecord.findMany({
          where: activeRecordsWhere,
          orderBy: { date: 'desc' },
          take: 5,
        }),
        prisma.$queryRaw<TrendRow[]>`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "date"), 'YYYY-MM') AS period,
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expenses
          FROM "FinancialRecord"
          WHERE "deletedAt" IS NULL
          GROUP BY DATE_TRUNC('month', "date")
          ORDER BY DATE_TRUNC('month', "date") ASC
        `,
      ]);

    const totalIncome = incomeAggregate._sum.amount ?? new Prisma.Decimal(0);
    const totalExpenses = expenseAggregate._sum.amount ?? new Prisma.Decimal(0);
    const netBalance = totalIncome.minus(totalExpenses);

    return {
      totalIncome: totalIncome.toString(),
      totalExpenses: totalExpenses.toString(),
      netBalance: netBalance.toString(),
      categoryTotals: categoryTotals
        .map((item) => ({
          category: item.category,
          amount: (item._sum.amount ?? new Prisma.Decimal(0)).toString(),
        }))
        .sort((left, right) => new Prisma.Decimal(right.amount).minus(left.amount).toNumber()),
      recentActivity: recentActivity.map(serializeRecord),
      trends: trends.map((trend) => ({
        period: trend.period,
        income: trend.income.toString(),
        expenses: trend.expenses.toString(),
      })),
    };
  },
};