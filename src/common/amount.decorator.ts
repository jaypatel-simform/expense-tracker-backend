import { applyDecorators } from '@nestjs/common';
import { IsNumber, IsPositive, Max } from 'class-validator';

/** Positive number with at most 2 decimals, fits Decimal(12,2). */
export const IsMoneyAmount = () =>
  applyDecorators(
    IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false }),
    IsPositive(),
    Max(9999999999.99),
  );
