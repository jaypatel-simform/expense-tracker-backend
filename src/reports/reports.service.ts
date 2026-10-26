import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SummaryQueryDto } from './dto/reports-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, query: SummaryQueryDto) {
    const now = new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = query.to
      ? new Date(query.to)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    const groups = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { userId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const categories = await this.prisma.category.findMany({
      where: { id: { in: groups.map((g) => g.categoryId) } },
      select: { id: true, name: true },
    });
    const names = new Map(categories.map((c) => [c.id, c.name]));

    const byCategory = groups
      .map((g) => ({
        categoryId: g.categoryId,
        name: names.get(g.categoryId) ?? 'Unknown',
        total: Number(g._sum.amount ?? 0),
        count: g._count._all,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      total: Math.round(byCategory.reduce((s, c) => s + c.total, 0) * 100) / 100,
      count: byCategory.reduce((s, c) => s + c.count, 0),
      byCategory,
    };
  }

  async monthly(userId: string, months = 6) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

    const expenses = await this.prisma.expense.findMany({
      where: { userId, date: { gte: start } },
      select: { date: true, amount: true },
    });

    const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const buckets = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      buckets.set(key(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))), 0);
    }
    for (const e of expenses) {
      const k = key(e.date);
      if (buckets.has(k)) buckets.set(k, buckets.get(k) + Number(e.amount));
    }

    return [...buckets.entries()].map(([month, total]) => ({
      month,
      total: Math.round(total * 100) / 100,
    }));
  }
}
