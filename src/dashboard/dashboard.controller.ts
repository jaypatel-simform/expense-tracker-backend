import { Controller, Get, Query } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import {
  MonthQueryDto,
  RecentQueryDto,
  TrendQueryDto,
} from './dto/dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() q: MonthQueryDto) {
    return this.dashboard.summary(user.id, q.month);
  }

  @Get('by-category')
  byCategory(@CurrentUser() user: AuthUser, @Query() q: MonthQueryDto) {
    return this.dashboard.byCategory(user.id, q.month);
  }

  @Get('trend')
  trend(@CurrentUser() user: AuthUser, @Query() q: TrendQueryDto) {
    return this.dashboard.trend(user.id, q.months, q.to);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser, @Query() q: RecentQueryDto) {
    return this.dashboard.recent(user.id, q.limit);
  }
}
