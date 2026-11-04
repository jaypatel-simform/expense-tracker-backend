import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  const prisma = {
    budget: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    user: { update: jest.fn(), findUnique: jest.fn() },
    expense: { aggregate: jest.fn(), groupBy: jest.fn() },
  };
  const categories = { findVisible: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CategoriesService, useValue: categories },
      ],
    }).compile();
    service = module.get(BudgetsService);
  });

  describe('list', () => {
    it('returns the user budgets with category names', async () => {
      prisma.budget.findMany.mockResolvedValue([
        {
          id: 'b1',
          categoryId: 'c1',
          amount: '400.00',
          category: { id: 'c1', name: 'Food' },
        },
      ]);
      expect(await service.list('u1')).toEqual([
        { id: 'b1', categoryId: 'c1', name: 'Food', amount: 400 },
      ]);
      expect(prisma.budget.findMany.mock.calls[0][0].where).toEqual({
        userId: 'u1',
      });
    });
  });

  describe('setCategoryBudget', () => {
    it('checks the category is visible, then upserts on userId+categoryId', async () => {
      categories.findVisible.mockResolvedValue({ id: 'c1' });
      prisma.budget.upsert.mockResolvedValue({
        id: 'b1',
        categoryId: 'c1',
        amount: '400',
        category: { id: 'c1', name: 'Food' },
      });

      const res = await service.setCategoryBudget('u1', 'c1', 400);

      expect(categories.findVisible).toHaveBeenCalledWith('u1', 'c1');
      expect(prisma.budget.upsert).toHaveBeenCalledTimes(1);
      const arg = prisma.budget.upsert.mock.calls[0][0];
      expect(arg.where).toEqual({
        userId_categoryId: { userId: 'u1', categoryId: 'c1' },
      });
      expect(arg.create).toEqual({
        userId: 'u1',
        categoryId: 'c1',
        amount: 400,
      });
      expect(arg.update).toEqual({ amount: 400 });
      expect(res).toEqual({
        id: 'b1',
        categoryId: 'c1',
        name: 'Food',
        amount: 400,
      });
    });

    it('404s and does not write when the category is not visible', async () => {
      categories.findVisible.mockRejectedValue(new NotFoundException());
      await expect(
        service.setCategoryBudget('u1', 'other-users-cat', 50),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.budget.upsert).not.toHaveBeenCalled();
    });
  });

  describe('removeCategoryBudget', () => {
    it('is scoped to the user', async () => {
      prisma.budget.deleteMany.mockResolvedValue({ count: 0 });
      await service.removeCategoryBudget('u1', 'c1');
      expect(prisma.budget.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', categoryId: 'c1' },
      });
    });
  });

  describe('overall budget', () => {
    it('sets the overall limit', async () => {
      prisma.user.update.mockResolvedValue({ overallBudget: '2000.00' });
      expect(await service.setOverall('u1', 2000)).toEqual({ amount: 2000 });
      expect(prisma.user.update.mock.calls[0][0].where).toEqual({ id: 'u1' });
      expect(prisma.user.update.mock.calls[0][0].data).toEqual({
        overallBudget: 2000,
      });
    });

    it('clears the overall limit', async () => {
      prisma.user.update.mockResolvedValue({ overallBudget: null });
      await service.clearOverall('u1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { overallBudget: null },
      });
    });
  });

  describe('status', () => {
    const budget = (categoryId: string, name: string, amount: string) => ({
      id: `b-${categoryId}`,
      categoryId,
      amount,
      category: { id: categoryId, name },
    });

    it('scopes spend queries to the user and UTC month', async () => {
      prisma.user.findUnique.mockResolvedValue({ overallBudget: null });
      prisma.budget.findMany.mockResolvedValue([]);
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.expense.groupBy.mockResolvedValue([]);

      const res = await service.status('u1', '2024-02');

      expect(res.month).toBe('2024-02');
      for (const where of [
        prisma.expense.aggregate.mock.calls[0][0].where,
        prisma.expense.groupBy.mock.calls[0][0].where,
      ]) {
        expect(where.userId).toBe('u1');
        expect(where.date.gte.toISOString()).toBe('2024-02-01T00:00:00.000Z');
        expect(where.date.lt.toISOString()).toBe('2024-03-01T00:00:00.000Z');
      }
      expect(prisma.budget.findMany.mock.calls[0][0].where).toEqual({
        userId: 'u1',
      });
    });

    it('overall is null when no overall limit is set', async () => {
      prisma.user.findUnique.mockResolvedValue({ overallBudget: null });
      prisma.budget.findMany.mockResolvedValue([]);
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: '90' } });
      prisma.expense.groupBy.mockResolvedValue([]);

      const res = await service.status('u1', '2024-02');
      expect(res.overall).toBeNull();
      expect(res.categories).toEqual([]);
    });

    it('zero spend: 0% used and the full limit remaining', async () => {
      prisma.user.findUnique.mockResolvedValue({ overallBudget: null });
      prisma.budget.findMany.mockResolvedValue([
        budget('c1', 'Food', '400.00'),
      ]);
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.expense.groupBy.mockResolvedValue([]);

      const res = await service.status('u1', '2024-02');
      expect(res.categories).toEqual([
        {
          categoryId: 'c1',
          name: 'Food',
          limit: 400,
          spent: 0,
          remaining: 400,
          percentUsed: 0,
        },
      ]);
    });

    it('partial spend', async () => {
      prisma.user.findUnique.mockResolvedValue({ overallBudget: null });
      prisma.budget.findMany.mockResolvedValue([
        budget('c1', 'Food', '400.00'),
      ]);
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: '100' } });
      prisma.expense.groupBy.mockResolvedValue([
        { categoryId: 'c1', _sum: { amount: '100' } },
      ]);

      const res = await service.status('u1', '2024-02');
      expect(res.categories[0]).toMatchObject({
        spent: 100,
        remaining: 300,
        percentUsed: 25,
      });
    });

    it('over the limit: remaining is negative, percent above 100', async () => {
      prisma.user.findUnique.mockResolvedValue({ overallBudget: null });
      prisma.budget.findMany.mockResolvedValue([
        budget('c1', 'Food', '400.00'),
      ]);
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: '410' } });
      prisma.expense.groupBy.mockResolvedValue([
        { categoryId: 'c1', _sum: { amount: '410' } },
      ]);

      const res = await service.status('u1', '2024-02');
      expect(res.categories[0]).toMatchObject({
        limit: 400,
        spent: 410,
        remaining: -10,
        percentUsed: 102.5,
      });
    });

    it('overall spent counts categories that have no budget', async () => {
      prisma.user.findUnique.mockResolvedValue({ overallBudget: '2000.00' });
      prisma.budget.findMany.mockResolvedValue([
        budget('c1', 'Food', '400.00'),
        budget('c3', 'Health', '100.00'), // budgeted, no spend
      ]);
      prisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: '1350.50' },
      });
      prisma.expense.groupBy.mockResolvedValue([
        { categoryId: 'c1', _sum: { amount: '350.50' } },
        { categoryId: 'c2', _sum: { amount: '1000.00' } }, // no budget
      ]);

      const res = await service.status('u1', '2024-02');

      expect(res.overall).toEqual({
        limit: 2000,
        spent: 1350.5,
        remaining: 649.5,
        percentUsed: 67.53,
      });
      expect(res.categories.map((c) => [c.name, c.spent])).toEqual([
        ['Food', 350.5],
        ['Health', 0],
      ]);
    });

    it('sorts categories by name', async () => {
      prisma.user.findUnique.mockResolvedValue({ overallBudget: null });
      prisma.budget.findMany.mockResolvedValue([
        budget('c2', 'Rent', '900'),
        budget('c1', 'Food', '400'),
      ]);
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.expense.groupBy.mockResolvedValue([]);

      const res = await service.status('u1', '2024-02');
      expect(res.categories.map((c) => c.name)).toEqual(['Food', 'Rent']);
    });
  });
});
