import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Matches(/^[A-Z]{3}$/, {
    message: 'defaultCurrency must be a 3-letter uppercase ISO code, e.g. USD',
  })
  defaultCurrency?: string;
}
