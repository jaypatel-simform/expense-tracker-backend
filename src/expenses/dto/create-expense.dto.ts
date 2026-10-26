import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9999999999)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** ISO date, e.g. 2025-01-31 */
  @IsDateString()
  date: string;

  @IsUUID()
  categoryId: string;
}
