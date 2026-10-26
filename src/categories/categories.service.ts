import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (existing) throw new ConflictException('Category already exists');
    return this.prisma.category.create({
      data: { name, userId },
      select: { id: true, name: true },
    });
  }

  async remove(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) throw new NotFoundException('Category not found');

    const inUse = await this.prisma.expense.count({ where: { categoryId: id, userId } });
    if (inUse > 0) {
      throw new ConflictException('Category has expenses; reassign or delete them first');
    }
    await this.prisma.category.delete({ where: { id } });
  }
}
