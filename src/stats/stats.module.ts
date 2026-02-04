import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatsService } from './stats.service';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { Payment, PaymentSchema } from '../payment/schemas/payment.schema';
import {
  FundTransaction,
  FundTransactionSchema,
} from '../fund/schemas/fund-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: FundTransaction.name, schema: FundTransactionSchema },
    ]),
  ],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
