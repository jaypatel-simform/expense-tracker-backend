import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { BudgetsService } from './budgets.service';
import { MonthQueryDto, SetBudgetDto } from './dto/budget.dto';

// Static routes (`status`, `overall`) are declared before `:categoryId`
// so they match first.
@Controller('budgets')
export class BudgetsController {
  constructor(private budgets: BudgetsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.budgets.list(user.id);
  }

  @Get('status')
  status(@CurrentUser() user: AuthUser, @Query() q: MonthQueryDto) {
    return this.budgets.status(user.id, q.month);
  }

  @Put('overall')
  setOverall(@CurrentUser() user: AuthUser, @Body() dto: SetBudgetDto) {
    return this.budgets.setOverall(user.id, dto.amount);
  }

  @Delete('overall')
  @HttpCode(204)
  clearOverall(@CurrentUser() user: AuthUser) {
    return this.budgets.clearOverall(user.id);
  }

  @Put(':categoryId')
  setCategoryBudget(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
    @Body() dto: SetBudgetDto,
  ) {
    return this.budgets.setCategoryBudget(user.id, categoryId, dto.amount);
  }

  @Delete(':categoryId')
  @HttpCode(204)
  removeCategoryBudget(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
  ) {
    return this.budgets.removeCategoryBudget(user.id, categoryId);
  }
}
