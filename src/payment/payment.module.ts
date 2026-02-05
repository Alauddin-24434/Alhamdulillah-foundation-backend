import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PaymentController } from './payment.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';

import { User, UserSchema } from '../user/schemas/user.schema';
import { FundModule } from 'src/fund/fund.module';
import {
  FundTransaction,
  FundTransactionSchema,
} from 'src/fund/schemas/fund-transaction.schema';

import { PaymentService } from './payment.service';

import { UserService } from 'src/user/user.service';
import { SslGateway } from './getways/ssl/ssl.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: FundTransaction.name, schema: FundTransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    FundModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService,  SslGateway, UserService],
  exports: [PaymentService],
})
export class PaymentModule {}
