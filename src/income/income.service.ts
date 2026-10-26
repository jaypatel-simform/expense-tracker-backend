import { Injectable, NotFoundException } from '@nestjs/common';
import { Income, Prisma } from '@prisma/client';
import { buildDateFilter } from '../common/date-range';
import { toNumber } from '../common/decimal.util';
import { paginated } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateIncomeDto,
  ListIncomeQueryDto,
  UpdateIncomeDto,
} from './dto/income.dto';

export function serializeIncome(i: Income) {
  return { ...i, amount: toNumber(i.amount) };
}

@Injectable()
export class IncomeService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, query: ListIncomeQueryDto) {
    const { page, limit, from, to } = query;
    const where: Prisma.IncomeWhereInput = { userId };
    const date = buildDateFilter(from, to);
    if (date) where.date = date;

    const [rows, total] = await Promise.all([
      this.prisma.income.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.income.count({ where }),
    ]);
    return paginated(rows.map(serializeIncome), total, page, limit);
  }

  async create(userId: string, dto: CreateIncomeDto) {
    const row = await this.prisma.income.create({
      data: {
        userId,
        amount: dto.amount,
        date: new Date(dto.date),
        source: dto.source,
        note: dto.note,
      },
    });
    return serializeIncome(row);
  }

  private async findOwned(userId: string, id: string) {
    const row = await this.prisma.income.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Income not found');
    return row;
  }

  async findOne(userId: string, id: string) {
    return serializeIncome(await this.findOwned(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto) {
    await this.findOwned(userId, id);
    const row = await this.prisma.income.update({
      where: { id },
      data: {
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        source: dto.source,
        note: dto.note,
      },
    });
    return serializeIncome(row);
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.income.delete({ where: { id } });
  }
}
