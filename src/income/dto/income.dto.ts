import { PartialType } from '@nestjs/mapped-types';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsMoneyAmount } from '../../common/amount.decorator';
import { DateRangeQueryDto } from '../../common/date-range';

export class CreateIncomeDto {
  @IsMoneyAmount()
  amount: number;

  @IsISO8601()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateIncomeDto extends PartialType(CreateIncomeDto) {}

export class ListIncomeQueryDto extends DateRangeQueryDto {}
