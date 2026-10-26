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
  CreateIncomeDto,
  ListIncomeQueryDto,
  UpdateIncomeDto,
} from './dto/income.dto';
import { IncomeService } from './income.service';

@Controller('income')
export class IncomeController {
  constructor(private income: IncomeService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListIncomeQueryDto) {
    return this.income.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIncomeDto) {
    return this.income.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.income.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ) {
    return this.income.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.income.remove(user.id, id);
  }
}
