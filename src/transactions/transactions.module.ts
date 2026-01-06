import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { FinancialsController } from './financials.controller';

@Module({
  controllers: [TransactionsController, FinancialsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
