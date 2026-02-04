import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FundTransaction,
  TransactionType,
} from './schemas/fund-transaction.schema';
import { CreateFundTransactionDto } from './dto/create-transaction.dto';
import {
  ExpenseRequest,
  ExpenseRequestStatus,
} from './schemas/expense-request.schema';
import { UserRole } from 'src/user/schemas/user.schema';
interface FundAggregateResult {
  totalIncome: number;
  totalExpense: number;
}

@Injectable()
export class FundService {
  constructor(
    @InjectModel(FundTransaction.name)
    private fundModel: Model<FundTransaction>,
    @InjectModel(ExpenseRequest.name)
    private expenseRequestModel: Model<ExpenseRequest>,
  ) {}

  // 1️⃣ Create Expense Request (Pending)
  async createExpenseRequest(
    createDto: CreateFundTransactionDto,
    userId: string,
  ) {
    const request = new this.expenseRequestModel({
      requesterId: userId,
      amount: createDto.amount,
      reason: createDto.reason,
      evidenceImages: createDto.evidenceImages || [],
      status: ExpenseRequestStatus.PENDING,
      approvals: [],
    });

    return request.save();
  }

  // 2️⃣ Get Pending Requests
  async getExpenseRequests(status?: ExpenseRequestStatus) {
    const query = status ? { status } : {};
    return this.expenseRequestModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('requesterId', 'name email')
      .populate('approvals', 'name email')
      .populate('finalApprovedBy', 'name email')
      .exec();
  }

  // 3️⃣ Approve Expense
  async approveExpense(requestId: string, user: any) {
    const request = await this.expenseRequestModel.findById(requestId);
    if (!request) throw new BadRequestException('Request not found');

    if (request.status !== ExpenseRequestStatus.PENDING) {
      throw new BadRequestException('Request is already processed');
    }

    // 🔥 Check if user already approved
    const alreadyApproved = request.approvals.some(
      (id) => id.toString() === user._id.toString(),
    );

    if (user.role === UserRole.ADMIN) {
      if (alreadyApproved) {
        throw new BadRequestException('You have already approved this request');
      }
      request.approvals.push(user._id);
    } else if (user.role === UserRole.SUPER_ADMIN) {
      // 🟢 SUPER ADMIN FINAL APPROVAL
      request.status = ExpenseRequestStatus.APPROVED;
      request.finalApprovedBy = user._id;

      // 💰 Now actually deduct from fund balance
      await this.finalizeExpense(request);
    }

    return request.save();
  }

  // 4️⃣ Finalize Expense (Deduct from balance)
  private async finalizeExpense(request: ExpenseRequest) {
    // Get current balance
    const lastTransaction = await this.fundModel
      .findOne()
      .sort({ createdAt: -1 });
    const currentBalance = lastTransaction
      ? lastTransaction.balanceSnapshot
      : 0;

    const newBalance = currentBalance - request.amount;

    if (newBalance < 0) {
      throw new BadRequestException('Insufficient fund for this expense');
    }

    const transaction = new this.fundModel({
      userId: request.requesterId,
      type: TransactionType.EXPENSE,
      amount: request.amount,
      reason: `[APPROVED EXPENSE] ${request.reason}`,
      balanceSnapshot: newBalance,
      transactionId: `EXP-${Date.now()}`,
      evidenceImages: request.evidenceImages,
    });

    return transaction.save();
  }

  // 5️⃣ Reject Expense
  async rejectExpense(requestId: string, reason: string) {
    const request = await this.expenseRequestModel.findById(requestId);
    if (!request) throw new BadRequestException('Request not found');

    request.status = ExpenseRequestStatus.REJECTED;
    request.rejectionReason = reason;

    return request.save();
  }

  async addTransaction(
    createFundTransactionDto: CreateFundTransactionDto,
    userId: string,
  ) {
    const {
      type,
      amount,
      reason,
      evidenceImages = [],
    } = createFundTransactionDto;

    if (type === TransactionType.EXPENSE) {
      return this.createExpenseRequest(createFundTransactionDto, userId);
    }

    // 1️⃣ Get current balance (last transaction)
    const lastTransaction = await this.fundModel
      .findOne()
      .sort({ createdAt: -1 });

    const currentBalance = lastTransaction
      ? lastTransaction.balanceSnapshot
      : 0;

    // 2️⃣ Calculate new balance
    let newBalance = currentBalance;

    if (type === TransactionType.INCOME) {
      newBalance += amount;
    } else {
      newBalance -= amount;
    }

    // ❗ Optional safety: prevent negative balance
    if (newBalance < 0) {
      throw new BadRequestException('Insufficient fund balance');
    }

    // 3️⃣ Create transaction
    const transaction = new this.fundModel({
      userId: userId,
      type,
      amount,
      reason,
      evidenceImages, // ✅ added
      balanceSnapshot: newBalance,
      transactionId: `TX-${Date.now()}`,
    });

    return transaction.save();
  }

  async getSummary() {
    const result = await this.fundModel.aggregate([
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ['$type', TransactionType.INCOME] }, '$amount', 0],
            },
          },
          totalExpense: {
            $sum: {
              $cond: [
                { $eq: ['$type', TransactionType.EXPENSE] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const lastTransaction = await this.fundModel
      .findOne()
      .sort({ date: -1, createdAt: -1 });
    const currentBalance = lastTransaction
      ? lastTransaction.balanceSnapshot
      : 0;

    if (!result.length) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        currentBalance: 0,
      };
    }
    const aggregateData = (result as FundAggregateResult[])[0];
    console.log({
      totalIncome: aggregateData.totalIncome,
      totalExpense: aggregateData.totalExpense,
      currentBalance,
    });

    return {
      totalIncome: aggregateData.totalIncome,
      totalExpense: aggregateData.totalExpense,
      currentBalance,
    };
  }

  async getHistory(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.fundModel
        .find()
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email")
        .populate("paymentId")
        .exec(),
      this.fundModel.countDocuments(),
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
   * 💰 Add fund transaction from payment
   * Called automatically when a payment is successful
   */
  async addTransactionFromPayment(
    userId: string,
    amount: number,
    paymentId: string,
    transactionId: string,
    purpose: string,
  ) {
    // 1️⃣ Get current balance
    const lastTransaction = await this.fundModel
      .findOne()
      .sort({ createdAt: -1 });

    const currentBalance = lastTransaction
      ? lastTransaction.balanceSnapshot
      : 0;

    // 2️⃣ Calculate new balance (payment is always INCOME)
    const newBalance = currentBalance + amount;

    // 3️⃣ Create transaction
    const transaction = new this.fundModel({
      userId,
      type: TransactionType.INCOME,
      amount,
      reason: purpose,
      balanceSnapshot: newBalance,
      transactionId,
      paymentId,
    });

    return transaction.save();
  }
}

