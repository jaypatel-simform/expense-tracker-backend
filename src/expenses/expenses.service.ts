import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { toNumber } from '../common/decimal.util';
import { buildDateFilter } from '../common/date-range';
import { paginated } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

const INCLUDE = { category: { select: { id: true, name: true } } } as const;

type ExpenseWithCategory = Prisma.ExpenseGetPayload<{
  include: typeof INCLUDE;
}>;

export function serializeExpense(e: ExpenseWithCategory) {
  return { ...e, amount: toNumber(e.amount) };
}

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private categories: CategoriesService,
  ) {}

  async list(userId: string, query: ListExpensesQueryDto) {
    const { page, limit, from, to, categoryId, search } = query;
    const where: Prisma.ExpenseWhereInput = { userId };
    const date = buildDateFilter(from, to);
    if (date) where.date = date;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.note = { contains: search, mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return paginated(rows.map(serializeExpense), total, page, limit);
  }

  async create(userId: string, dto: CreateExpenseDto) {
    // Throws 404 if the category is neither a default nor the user's own
    await this.categories.findVisible(userId, dto.categoryId);
    const row = await this.prisma.expense.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        date: new Date(dto.date),
        note: dto.note,
        paymentMethod: dto.paymentMethod,
      },
      include: INCLUDE,
    });
    return serializeExpense(row);
  }

  private async findOwned(userId: string, id: string) {
    const row = await this.prisma.expense.findFirst({
      where: { id, userId },
      include: INCLUDE,
    });
    if (!row) throw new NotFoundException('Expense not found');
    return row;
  }

  async findOne(userId: string, id: string) {
    return serializeExpense(await this.findOwned(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOwned(userId, id);
    if (dto.categoryId)
      await this.categories.findVisible(userId, dto.categoryId);
    const row = await this.prisma.expense.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note,
        paymentMethod: dto.paymentMethod,
      },
      include: INCLUDE,
    });
    return serializeExpense(row);
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.expense.delete({ where: { id } });
  }
}
