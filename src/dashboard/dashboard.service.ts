import { Injectable } from '@nestjs/common';
import { round2, toNumber } from '../common/decimal.util';
import {
  bucketByMonth,
  currentMonth,
  lastMonths,
  monthRange,
} from '../common/month.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary(userId: string, month: string = currentMonth()) {
    const { start, end } = monthRange(month);
    const where = { userId, date: { gte: start, lt: end } };
    const [spentAgg, incomeAgg] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
      this.prisma.income.aggregate({ where, _sum: { amount: true } }),
    ]);
    const spent = toNumber(spentAgg._sum.amount);
    const income = toNumber(incomeAgg._sum.amount);
    return { month, spent, income, balance: round2(income - spent) };
  }

  async byCategory(userId: string, month: string = currentMonth()) {
    const { start, end } = monthRange(month);
    const groups = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    if (groups.length === 0) return [];

    const categories = await this.prisma.category.findMany({
      where: { id: { in: groups.map((g) => g.categoryId) } },
      select: { id: true, name: true },
    });
    const names = new Map(categories.map((c) => [c.id, c.name]));

    const rows = groups.map((g) => ({
      categoryId: g.categoryId,
      name: names.get(g.categoryId) ?? 'Unknown',
      total: toNumber(g._sum.amount),
    }));
    const grand = rows.reduce((sum, r) => sum + r.total, 0);
    return rows
      .map((r) => ({
        ...r,
        percentage: grand > 0 ? round2((r.total / grand) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async trend(userId: string, months = 6, to: string = currentMonth()) {
    const labels = lastMonths(to, months);
    const start = monthRange(labels[0]).start;
    const end = monthRange(to).end;
    const where = { userId, date: { gte: start, lt: end } };
    const [expenses, incomes] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        select: { date: true, amount: true },
      }),
      this.prisma.income.findMany({
        where,
        select: { date: true, amount: true },
      }),
    ]);
    const spent = bucketByMonth(
      labels,
      expenses.map((e) => ({ date: e.date, amount: toNumber(e.amount) })),
    );
    const income = bucketByMonth(
      labels,
      incomes.map((i) => ({ date: i.date, amount: toNumber(i.amount) })),
    );
    return labels.map((month) => ({
      month,
      spent: round2(spent.get(month) ?? 0),
      income: round2(income.get(month) ?? 0),
    }));
  }

  async recent(userId: string, limit = 10) {
    const [expenses, incomes] = await Promise.all([
      this.prisma.expense.findMany({
        where: { userId },
        include: { category: { select: { id: true, name: true } } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      }),
      this.prisma.income.findMany({
        where: { userId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      }),
    ]);
    const items = [
      ...expenses.map((e) => ({
        type: 'expense' as const,
        id: e.id,
        amount: toNumber(e.amount),
        date: e.date,
        note: e.note,
        category: e.category,
        paymentMethod: e.paymentMethod,
      })),
      ...incomes.map((i) => ({
        type: 'income' as const,
        id: i.id,
        amount: toNumber(i.amount),
        date: i.date,
        note: i.note,
        source: i.source,
      })),
    ];
    return items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }
}
