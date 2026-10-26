import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';
import { MonthlyQueryDto, SummaryQueryDto } from './dto/reports-query.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Total + per-category breakdown for a date range (defaults to the current month). */
  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() query: SummaryQueryDto) {
    return this.reports.summary(user.id, query);
  }

  /** Totals per month for the last N months (default 6). */
  @Get('monthly')
  monthly(@CurrentUser() user: AuthUser, @Query() query: MonthlyQueryDto) {
    return this.reports.monthly(user.id, query.months);
  }
}
