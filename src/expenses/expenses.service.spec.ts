import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  const prisma = {
    expense: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const categories = { findVisible: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CategoriesService, useValue: categories },
      ],
    }).compile();
    service = module.get(ExpensesService);
  });

  describe('list', () => {
    it('builds where from user, date range, category and note search', async () => {
      prisma.expense.findMany.mockResolvedValue([
        { id: 'e1', amount: '12.50', category: { id: 'c1', name: 'Food' } },
      ]);
      prisma.expense.count.mockResolvedValue(45);

      const res = await service.list('u1', {
        page: 3,
        limit: 10,
        from: '2024-01-01',
        to: '2024-01-31',
        categoryId: 'c1',
        search: 'lunch',
      });

      const args = prisma.expense.findMany.mock.calls[0][0];
      expect(args.where.userId).toBe('u1');
      expect(args.where.categoryId).toBe('c1');
      expect(args.where.note).toEqual({
        contains: 'lunch',
        mode: 'insensitive',
      });
      expect(args.where.date.gte).toEqual(new Date('2024-01-01'));
      // date-only "to" includes the whole day
      expect(args.where.date.lt).toEqual(new Date('2024-02-01'));
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
      expect(args.orderBy[0]).toEqual({ date: 'desc' });
      expect(prisma.expense.count).toHaveBeenCalledWith({ where: args.where });
      expect(res.meta).toEqual({
        page: 3,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
      expect(res.data[0].amount).toBe(12.5);
    });

    it('only filters by user when no filters are given', async () => {
      prisma.expense.findMany.mockResolvedValue([]);
      prisma.expense.count.mockResolvedValue(0);
      await service.list('u1', { page: 1, limit: 20 });
      expect(prisma.expense.findMany.mock.calls[0][0].where).toEqual({
        userId: 'u1',
      });
    });
  });

  describe('create', () => {
    const dto = {
      amount: 10,
      date: '2024-01-05',
      categoryId: 'foreign',
      paymentMethod: 'CASH' as const,
    };

    it('rejects a category that is not visible to the user', async () => {
      categories.findVisible.mockRejectedValue(new NotFoundException());
      await expect(service.create('u1', dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('creates the expense for the current user', async () => {
      categories.findVisible.mockResolvedValue({ id: 'foreign' });
      prisma.expense.create.mockResolvedValue({ id: 'e1', amount: '10.00' });
      const res = await service.create('u1', dto);
      expect(prisma.expense.create.mock.calls[0][0].data).toMatchObject({
        userId: 'u1',
        categoryId: 'foreign',
        amount: 10,
      });
      expect(res.amount).toBe(10);
    });
  });

  describe("another user's expense", () => {
    beforeEach(() => prisma.expense.findFirst.mockResolvedValue(null));

    it('update gives NotFound', async () => {
      await expect(
        service.update('u1', 'e9', { note: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.expense.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'e9', userId: 'u1' } }),
      );
      expect(prisma.expense.update).not.toHaveBeenCalled();
    });

    it('delete gives NotFound', async () => {
      await expect(service.remove('u1', 'e9')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.expense.delete).not.toHaveBeenCalled();
    });
  });
});
