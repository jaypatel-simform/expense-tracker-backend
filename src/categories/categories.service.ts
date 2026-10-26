import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /** Defaults (global) plus the user's own categories. */
  list(userId: string) {
    return this.prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /** Visible to the user: a default or one of their own. Otherwise 404. */
  async findVisible(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, OR: [{ userId: null }, { userId }] },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /** Must be the user's own, non-default category. */
  private async findOwned(userId: string, id: string) {
    const category = await this.findVisible(userId, id);
    if (category.isDefault || category.userId === null) {
      throw new ForbiddenException('Default categories cannot be modified');
    }
    return category;
  }

  private async assertNameFree(
    userId: string,
    name: string,
    exceptId?: string,
  ) {
    const clash = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        OR: [{ userId: null }, { userId }],
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
    });
    if (clash) throw new ConflictException('Category name already exists');
  }

  async create(userId: string, dto: CreateCategoryDto) {
    await this.assertNameFree(userId, dto.name);
    return this.prisma.category.create({
      data: { name: dto.name, userId, isDefault: false },
    });
  }

  findOne(userId: string, id: string) {
    return this.findVisible(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOwned(userId, id);
    if (dto.name !== undefined) await this.assertNameFree(userId, dto.name, id);
    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    const inUse = await this.prisma.expense.count({
      where: { categoryId: id },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `Category is used by ${inUse} expense(s); reassign or delete them first`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }
}
