import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorator/rolesDecorator';
import { TransactionsService } from './transactions.service';

@ApiTags('Financials')
@Roles('ADMIN')
@Controller('financials')
export class FinancialsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get financial summary (revenue, expenses, profit)',
  })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getSummary(@Query('months') months = 6) {
    return this.transactionsService.getFinancialSummary(months);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export transactions report as CSV' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const data = await this.transactionsService.exportReport(from, to);

    // Simple CSV generation
    const csvHeader = 'ID,Date,Customer,Service,Amount,Payout,Fee,Status\n';
    const csvRows = data
      .map(
        (t) =>
          `${t.txnId},${t.date.toISOString()},${t.order.customer.name},${t.order.service.name},${t.amount.toString()},${t.techPayout.toString()},${t.platformFee.toString()},${t.status}`,
      )
      .join('\n');

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=report.csv');
    res.send(csvHeader + csvRows);
  }
}
