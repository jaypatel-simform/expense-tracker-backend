import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListExpensesQueryDto) {
    return this.expenses.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expenses.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expenses.remove(user.id, id);
  }
}
