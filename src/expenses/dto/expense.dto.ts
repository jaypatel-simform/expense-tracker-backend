import { PartialType } from '@nestjs/mapped-types';
import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsMoneyAmount } from '../../common/amount.decorator';
import { DateRangeQueryDto } from '../../common/date-range';

export class CreateExpenseDto {
  @IsMoneyAmount()
  amount: number;

  @IsISO8601()
  date: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ListExpensesQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;
}
