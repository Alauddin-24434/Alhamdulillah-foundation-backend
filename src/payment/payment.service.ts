import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentPurpose,
} from './schemas/payment.schema';

import { UserService } from 'src/user/user.service';
import { SslGateway } from './getways/ssl/ssl.gateway';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from 'src/user/schemas/user.schema';
import { FundService } from 'src/fund/fund.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly sslGateway: SslGateway,
    private readonly userService: UserService,
    private readonly fundService: FundService,
    @InjectModel(Payment.name)
      private readonly paymentModel: Model<Payment>,
     @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
  ) {}

  async processPayment(
    userId: string,
    dto: { method: PaymentMethod; amount: number; purpose: PaymentPurpose },
  ) {
    const { method, amount, purpose } = dto;

    const year = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const date = new Date().getDate().toString().padStart(2, '0');
    const transactionId = `TXN${year}${randomNum}${date}`;

    const user = await this.userService.findUserById(userId);

    // CREATE PAYMENT RECORD FIRST
    const payment = await this.paymentModel.create({
      userId,
      amount,
      method,
      purpose,
      transactionId,
      paymentStatus: PaymentStatus.INITIATED,
    });

    const payload = {
      user,
      userId,
      amount,
      purpose,
      transactionId,
      paymentId: payment._id,
    };

    switch (method) {
      case PaymentMethod.SSLCOMMERZ:
        const result = await this.sslGateway.createPayment(payload);
        return result.gatewayUrl;

      default:
        throw new Error('Unsupported payment method');
    }
  }
    
  async getUserPayments(userId: string, query: any) {
    const { status, page = 1, limit = 10 } = query || {};
    const filter: any = { userId };

    if (status && status !== "ALL") {
      filter.paymentStatus = status;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
    
  async getAllPayments(query: any) {
    const { status, search, page = 1, limit = 10 } = query || {};
    const filter: any = {};

    if (status && status !== "ALL") {
      filter.paymentStatus = status;
    }

    if (search) {
      // search by transactionId or other fields if needed
      filter.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { senderNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate("userId", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  /**
   * UNIVERSAL POST-PAYMENT PROCESS
   * Handles user role updates, fund transactions, and payment status.
   */
  private async completePaymentProcess(paymentId: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment || payment.paymentStatus === PaymentStatus.PAID) {
      return;
    }

    console.log(`[PAYMENT] Processing completion for ${paymentId} (${payment.transactionId})`);

    // 1. Update Payment Record
    payment.paymentStatus = PaymentStatus.PAID;
    payment.paidAt = new Date();
    await payment.save();

    // 2. Fund Injection (Donations)
    if (payment.purpose === PaymentPurpose.MONTHLY_DONATION || payment.purpose === PaymentPurpose.PROJECT_DONATION) {
      await this.fundService.addTransactionFromPayment(
        payment.userId.toString(),
        payment.amount,
        payment._id.toString(),
        payment.transactionId,
        payment.purpose === PaymentPurpose.MONTHLY_DONATION ? 'Monthly Donation' : 'Project Donation',
      );
      console.log(`[PAYMENT] Fund record created for ${payment.transactionId}`);
    }

    // 3. Authority Elevation (Membership)
    if (payment.purpose === PaymentPurpose.MEMBERSHIP_FEE) {
      const user = await this.userModel.findById(payment.userId);
      if (user) {
        user.role = UserRole.MEMBER;
        user.status = UserStatus.ACTIVE;
        await user.save();
        console.log(`[PAYMENT] Authority elevated to MEMBER for user: ${user.email}`);
      } else {
        console.warn(`[PAYMENT] User not found for role elevation: ${payment.userId}`);
      }
    }
  }

// ===============================
// SSL SUCCESS
// ===============================
async handleSslSuccess(payload: any) {
  const { tran_id } = payload;
  const payment = await this.paymentModel.findOne({ transactionId: tran_id });

  if (!payment) throw new BadRequestException('Payment record not found');

  await this.completePaymentProcess(payment._id.toString());

  return {
    message: payment.purpose === PaymentPurpose.MEMBERSHIP_FEE 
      ? 'Payment successful & membership activated'
      : 'Payment successful & fund updated',
  };
}

  // ===============================
  // SSL FAIL
  // ===============================
  async handleSslFail(payload: any) {
    const { tran_id } = payload;

    await this.paymentModel.updateOne(
      { transactionId: tran_id },
      { paymentStatus: PaymentStatus.FAILED },
    );

    return {
      message: 'Payment failed',
    };
  }

  // ===============================
  // SSL CANCEL
  // ===============================
  async handleSslCancel(payload: any) {
    const { tran_id } = payload;

    await this.paymentModel.updateOne(
      { transactionId: tran_id },
      { paymentStatus: PaymentStatus.CANCELLED },
    );

    return {
      message: 'Payment cancelled',
    };
  }

  // ===============================
  // SSL IPN (SERVER TO SERVER)
  // ===============================
  async handleSslIpn(payload: any) {
    const { tran_id, status } = payload;

    if (status !== 'VALID') {
      return { message: 'Invalid IPN' };
    }

    const payment = await this.paymentModel.findOne({
      transactionId: tran_id,
    });

    if (!payment) return;

    payment.paymentStatus = PaymentStatus.PAID;
    payment.paidAt = new Date();
    await payment.save();

    return { message: 'IPN processed' };
  }

  async getPaymentById(id: string, userId: string, role: string) {
    const payment = await this.paymentModel.findById(id).populate('userId', 'name email phone address cityState avatar');
    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // Security: Only the user who made the payment or an Admin can see the invoice
    if (payment.userId['_id'].toString() !== userId && role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
      throw new BadRequestException('Unauthorized access to invoice');
    }

    return payment;
  }
}
