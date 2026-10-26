import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { MONTH_REGEX } from '../../common/month.util';

const MONTH_MSG = 'must be in YYYY-MM format';

export class MonthQueryDto {
  @IsOptional()
  @Matches(MONTH_REGEX, { message: `month ${MONTH_MSG}` })
  month?: string;
}

export class TrendQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months: number = 6;

  @IsOptional()
  @Matches(MONTH_REGEX, { message: `to ${MONTH_MSG}` })
  to?: string;
}

export class RecentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
