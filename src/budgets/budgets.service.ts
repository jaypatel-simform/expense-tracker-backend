import { Injectable } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { round2, toNumber } from '../common/decimal.util';
import { currentMonth, monthRange } from '../common/month.util';
import { PrismaService } from '../prisma/prisma.service';

const WITH_CATEGORY = {
  category: { select: { id: true, name: true } },
} as const;

@Injectable()
export class BudgetsService {
  constructor(
    private prisma: PrismaService,
    private categories: CategoriesService,
  ) {}

  async list(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      include: WITH_CATEGORY,
      orderBy: { category: { name: 'asc' } },
    });
    return budgets.map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      name: b.category.name,
      amount: toNumber(b.amount),
    }));
  }

  /** Sets or changes the limit. 404 if the category is not visible to the user. */
  async setCategoryBudget(userId: string, categoryId: string, amount: number) {
    await this.categories.findVisible(userId, categoryId);
    const b = await this.prisma.budget.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      create: { userId, categoryId, amount },
      update: { amount },
      include: WITH_CATEGORY,
    });
    return {
      id: b.id,
      categoryId: b.categoryId,
      name: b.category.name,
      amount: toNumber(b.amount),
    };
  }

  /** Idempotent; only ever touches the user's own rows. */
  async removeCategoryBudget(userId: string, categoryId: string) {
    await this.prisma.budget.deleteMany({ where: { userId, categoryId } });
  }

  async setOverall(userId: string, amount: number) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { overallBudget: amount },
      select: { overallBudget: true },
    });
    return { amount: toNumber(user.overallBudget) };
  }

  async clearOverall(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { overallBudget: null },
    });
  }

  async status(userId: string, month: string = currentMonth()) {
    const { start, end } = monthRange(month);
    const where = { userId, date: { gte: start, lt: end } };
    const [user, budgets, totalAgg, groups] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { overallBudget: true },
      }),
      this.prisma.budget.findMany({
        where: { userId },
        include: WITH_CATEGORY,
      }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const spentByCategory = new Map(
      groups.map((g) => [g.categoryId, toNumber(g._sum.amount)]),
    );
    const categories = budgets
      .map((b) => ({
        categoryId: b.categoryId,
        name: b.category.name,
        ...this.line(
          toNumber(b.amount),
          spentByCategory.get(b.categoryId) ?? 0,
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const overallLimit = user?.overallBudget;
    const overall =
      overallLimit === null || overallLimit === undefined
        ? null
        : this.line(toNumber(overallLimit), toNumber(totalAgg._sum.amount));

    return { month, overall, categories };
  }

  private line(limit: number, spent: number) {
    return {
      limit,
      spent: round2(spent),
      remaining: round2(limit - spent),
      percentUsed: limit > 0 ? round2((spent / limit) * 100) : 0,
    };
  }
}
