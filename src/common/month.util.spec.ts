import {
  bucketByMonth,
  currentMonth,
  formatMonth,
  lastMonths,
  monthRange,
  shiftMonth,
} from './month.util';

describe('month.util', () => {
  it('computes a UTC [start, end) range', () => {
    const { start, end } = monthRange('2024-02');
    expect(start.toISOString()).toBe('2024-02-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2024-03-01T00:00:00.000Z');
  });

  it('rolls December over into the next year', () => {
    expect(monthRange('2023-12').end.toISOString()).toBe(
      '2024-01-01T00:00:00.000Z',
    );
  });

  it('rejects invalid months', () => {
    expect(() => monthRange('2024-13')).toThrow();
    expect(() => monthRange('2024-1')).toThrow();
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2024-01', -1)).toBe('2023-12');
    expect(shiftMonth('2023-11', 3)).toBe('2024-02');
  });

  it('lists the last N months oldest first', () => {
    expect(lastMonths('2024-02', 4)).toEqual([
      '2023-11',
      '2023-12',
      '2024-01',
      '2024-02',
    ]);
  });

  it('formats dates in UTC', () => {
    expect(formatMonth(new Date('2024-03-31T23:59:59Z'))).toBe('2024-03');
    expect(currentMonth(new Date('2024-05-10T00:00:00Z'))).toBe('2024-05');
  });

  it('buckets rows and zero-fills empty months', () => {
    const months = ['2024-01', '2024-02', '2024-03'];
    const totals = bucketByMonth(months, [
      { date: new Date('2024-01-05T00:00:00Z'), amount: 10 },
      { date: new Date('2024-01-20T00:00:00Z'), amount: 5 },
      { date: new Date('2024-03-01T00:00:00Z'), amount: 7 },
      { date: new Date('2023-12-31T00:00:00Z'), amount: 99 },
    ]);
    expect([...totals.entries()]).toEqual([
      ['2024-01', 15],
      ['2024-02', 0],
      ['2024-03', 7],
    ]);
  });
});
