import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FundController } from './fund.controller';
import { FundService } from './fund.service';
import {
  FundTransaction,
  FundTransactionSchema,
} from './schemas/fund-transaction.schema';
import {
  ExpenseRequest,
  ExpenseRequestSchema,
} from './schemas/expense-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FundTransaction.name, schema: FundTransactionSchema },
      { name: ExpenseRequest.name, schema: ExpenseRequestSchema },
    ]),
  ],
  controllers: [FundController],
  providers: [FundService],
  exports: [FundService, MongooseModule],
})
export class FundModule {}
