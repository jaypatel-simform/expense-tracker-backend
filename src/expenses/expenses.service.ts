import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';

const include = { category: { select: { id: true, name: true } } } satisfies Prisma.ExpenseInclude;

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListExpensesQueryDto) {
    const { from, to, categoryId, page, limit } = query;
    const where: Prisma.ExpenseWhereInput = {
      userId,
      ...(categoryId ? { categoryId } : {}),
      ...(from || to
        ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async get(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, userId }, include });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async create(userId: string, dto: CreateExpenseDto) {
    await this.assertCategory(userId, dto.categoryId);
    return this.prisma.expense.create({
      data: {
        amount: dto.amount,
        description: dto.description,
        note: dto.note,
        date: new Date(dto.date),
        categoryId: dto.categoryId,
        userId,
      },
      include,
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await this.get(userId, id);
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    return this.prisma.expense.update({
      where: { id },
      data: {
        amount: dto.amount,
        description: dto.description,
        note: dto.note,
        categoryId: dto.categoryId,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include,
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.expense.delete({ where: { id } });
  }

  private async assertCategory(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) throw new BadRequestException('Invalid category');
  }
}
