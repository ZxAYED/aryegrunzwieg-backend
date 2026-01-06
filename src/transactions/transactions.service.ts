import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPagination } from '../common/utils/pagination';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }) {
    const { page, limit, from, to } = params;
    const { skip, take } = getPagination(page, limit, 0);

    const where: Prisma.TransactionWhereInput = {
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [totalItems, data] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip,
        take,
        include: {
          order: {
            include: {
              customer: { select: { firstName: true, lastName: true } },
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const pagination = getPagination(page, limit, totalItems);

    return {
      data,
      meta: pagination.meta,
    };
  }

  async getFinancialSummary(months: number) {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: { gte: fromDate },
        status: 'COMPLETED',
      },
    });

    const totalRevenue = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const totalExpenses = transactions.reduce(
      (sum, t) => sum + Number(t.techPayout),
      0,
    );
    const netProfit = totalRevenue - totalExpenses; // Simplified, assuming platform fee is part of revenue logic or separate

    // Group by month for chart
    const monthlyData: Record<string, { revenue: number; expenses: number }> =
      {};

    transactions.forEach((t) => {
      const month = t.date.toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0 };
      }
      monthlyData[month].revenue += Number(t.amount);
      monthlyData[month].expenses += Number(t.techPayout);
    });

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
      },
      chart: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
      })),
    };
  }

  async exportReport(from?: string, to?: string) {
    const where: Prisma.TransactionWhereInput = {
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        order: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // In real app, generate CSV string/stream here
    return transactions;
  }
}
