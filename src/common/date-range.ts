import { IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Pagination plus an optional inclusive from/to date range. */
export class DateRangeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

/**
 * Build a Prisma date filter. A date-only `to` (YYYY-MM-DD) includes the
 * whole day; a full timestamp is treated as an inclusive upper bound.
 */
export function buildDateFilter(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const filter: { gte?: Date; lt?: Date; lte?: Date } = {};
  if (from) filter.gte = new Date(from);
  if (to) {
    if (DATE_ONLY.test(to)) {
      const end = new Date(to);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.lt = end;
    } else {
      filter.lte = new Date(to);
    }
  }
  return filter;
}
