export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface MonthRange {
  start: Date; // inclusive, UTC
  end: Date; // exclusive, UTC
}

/** "YYYY-MM" for a date, in UTC. */
export function formatMonth(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function currentMonth(now: Date = new Date()): string {
  return formatMonth(now);
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  if (!MONTH_REGEX.test(month)) {
    throw new Error(`Invalid month "${month}", expected YYYY-MM`);
  }
  const [y, m] = month.split('-').map(Number);
  return { year: y, monthIndex: m - 1 };
}

/** UTC [start, end) range of a "YYYY-MM" month. */
export function monthRange(month: string): MonthRange {
  const { year, monthIndex } = parseMonth(month);
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

/** Shift a "YYYY-MM" month by `delta` months (negative = back). */
export function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month);
  return formatMonth(new Date(Date.UTC(year, monthIndex + delta, 1)));
}

/** Ordered list (oldest first) of `count` months ending at `to` inclusive. */
export function lastMonths(to: string, count: number): string[] {
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    result.push(shiftMonth(to, -i));
  }
  return result;
}

/**
 * Sum rows into month buckets. Months with no rows are zero-filled and the
 * result follows the order of `months`. Rows outside `months` are ignored.
 */
export function bucketByMonth(
  months: string[],
  rows: { date: Date; amount: number }[],
): Map<string, number> {
  const totals = new Map<string, number>(months.map((m) => [m, 0]));
  for (const row of rows) {
    const key = formatMonth(row.date);
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + row.amount);
    }
  }
  return totals;
}
