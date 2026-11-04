import { IsMoneyAmount } from '../../common/amount.decorator';

export { MonthQueryDto } from '../../dashboard/dto/dashboard.dto';

export class SetBudgetDto {
  @IsMoneyAmount()
  amount: number;
}
