import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma = {
    expense: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    income: { aggregate: jest.fn(), findMany: jest.fn() },
    category: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(DashboardService);
  });

  describe('summary', () => {
    it('balance is income minus spent, scoped to the UTC month', async () => {
      prisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: '250.40' },
      });
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: '1000.00' },
      });

      const res = await service.summary('u1', '2024-02');

      expect(res).toEqual({
        month: '2024-02',
        spent: 250.4,
        income: 1000,
        balance: 749.6,
      });
      const where = prisma.expense.aggregate.mock.calls[0][0].where;
      expect(where.userId).toBe('u1');
      expect(where.date.gte.toISOString()).toBe('2024-02-01T00:00:00.000Z');
      expect(where.date.lt.toISOString()).toBe('2024-03-01T00:00:00.000Z');
    });

    it('treats null sums as 0', async () => {
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
      expect(await service.summary('u1', '2024-02')).toEqual({
        month: '2024-02',
        spent: 0,
        income: 0,
        balance: 0,
      });
    });

    it('can go negative', async () => {
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: '30' } });
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
      expect((await service.summary('u1', '2024-02')).balance).toBe(-30);
    });
  });

  describe('byCategory', () => {
    it('returns totals with percentages, largest first', async () => {
      prisma.expense.groupBy.mockResolvedValue([
        { categoryId: 'c1', _sum: { amount: '25' } },
        { categoryId: 'c2', _sum: { amount: '75' } },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'Food' },
        { id: 'c2', name: 'Rent' },
      ]);
      expect(await service.byCategory('u1', '2024-02')).toEqual([
        { categoryId: 'c2', name: 'Rent', total: 75, percentage: 75 },
        { categoryId: 'c1', name: 'Food', total: 25, percentage: 25 },
      ]);
    });

    it('returns an empty list when nothing was spent', async () => {
      prisma.expense.groupBy.mockResolvedValue([]);
      expect(await service.byCategory('u1', '2024-02')).toEqual([]);
      expect(prisma.category.findMany).not.toHaveBeenCalled();
    });
  });

  describe('trend', () => {
    it('zero-fills empty months and orders oldest first', async () => {
      prisma.expense.findMany.mockResolvedValue([
        { date: new Date('2024-01-10T00:00:00Z'), amount: '10.10' },
        { date: new Date('2024-01-11T00:00:00Z'), amount: '5.20' },
        { date: new Date('2024-03-01T00:00:00Z'), amount: '4' },
      ]);
      prisma.income.findMany.mockResolvedValue([
        { date: new Date('2024-02-15T00:00:00Z'), amount: '100' },
      ]);

      expect(await service.trend('u1', 3, '2024-03')).toEqual([
        { month: '2024-01', spent: 15.3, income: 0 },
        { month: '2024-02', spent: 0, income: 100 },
        { month: '2024-03', spent: 4, income: 0 },
      ]);
      const where = prisma.expense.findMany.mock.calls[0][0].where;
      expect(where.date.gte.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(where.date.lt.toISOString()).toBe('2024-04-01T00:00:00.000Z');
    });
  });

  describe('recent', () => {
    it('merges expenses and income by date desc, tagged by type', async () => {
      prisma.expense.findMany.mockResolvedValue([
        {
          id: 'e1',
          amount: '5',
          date: new Date('2024-02-03'),
          note: null,
          category: { id: 'c', name: 'Food' },
          paymentMethod: 'CASH',
        },
        {
          id: 'e2',
          amount: '6',
          date: new Date('2024-02-01'),
          note: null,
          category: { id: 'c', name: 'Food' },
          paymentMethod: 'CASH',
        },
      ]);
      prisma.income.findMany.mockResolvedValue([
        {
          id: 'i1',
          amount: '50',
          date: new Date('2024-02-02'),
          note: null,
          source: 'Job',
        },
      ]);
      const res = await service.recent('u1', 2);
      expect(res.map((r) => [r.type, r.id])).toEqual([
        ['expense', 'e1'],
        ['income', 'i1'],
      ]);
    });
  });
});
