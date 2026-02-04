import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';
import { Project, ProjectStatus } from '../project/schemas/project.schema';
import { Payment, PaymentStatus } from '../payment/schemas/payment.schema';
import { FundTransaction } from '../fund/schemas/fund-transaction.schema';

interface AggregateResult {
  total: number;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(FundTransaction.name)
    private fundModel: Model<FundTransaction>,
  ) {}

  async getAdminStats() {
    const [
      totalUsers,
      totalProjects,
      activeProjects,
      totalRaisedResult,
      lastFundTransaction,
      monthlyStats,
      projectDistribution,
      recentDonations,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.projectModel.countDocuments(),
      this.projectModel.countDocuments({ status: ProjectStatus.ONGOING }),
      this.paymentModel.aggregate([
        { $match: { paymentStatus: PaymentStatus.PAID } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.fundModel.findOne().sort({ createdAt: -1 }),
      this.getMonthlyStats(),
      this.getProjectDistribution(),
      this.getRecentDonations(),
    ]);

    const totalRaised = (totalRaisedResult as AggregateResult[])[0]?.total || 0;
    const currentBalance = lastFundTransaction?.balanceSnapshot || 0;

    return {
      totalUsers,
      totalProjects,
      activeProjects,
      totalRaised,
      currentBalance,
      monthlyStats,
      projectDistribution,
      recentDonations,
      // Mapping to frontend expected keys
      projectsActive: activeProjects,
      totalInvested: totalRaised,
      membersCount: totalUsers,
    };
  }

  async getMonthlyStats() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const stats = await this.paymentModel.aggregate([
      {
        $match: {
          paymentStatus: PaymentStatus.PAID,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Fill in missing months
    const months: { month: string; year: number; amount: number; monthNum: number }[] = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        months.push({
            month: d.toLocaleString('default', { month: 'short' }),
            year: d.getFullYear(),
            amount: 0,
            monthNum: d.getMonth() + 1
        });
    }

    return months.map(m => {
        const found = stats.find(s => s._id.month === m.monthNum && s._id.year === m.year);
        return {
            name: m.month,
            amount: found ? found.amount : 0
        };
    });
  }

  async getProjectDistribution() {
    const stats = await this.projectModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats.map(s => ({
      name: s._id,
      value: s.count,
    }));
  }

  async getRecentDonations() {
    return this.paymentModel
      .find({ paymentStatus: PaymentStatus.PAID })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email');
  }

  async getUserStats(userId: string) {
    const [
      myInvestmentsResult,
      myMonthlyStats,
      totalProjects,
      activeProjects,
      projectDistribution,
      totalUsers,
      lastFundTransaction,
    ] = await Promise.all([
      this.paymentModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            paymentStatus: PaymentStatus.PAID,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.getUserMonthlyStats(userId),
      this.projectModel.countDocuments(),
      this.projectModel.countDocuments({ status: ProjectStatus.ONGOING }),
      this.getProjectDistribution(),
      this.userModel.countDocuments(),
      this.fundModel.findOne().sort({ createdAt: -1 }),
    ]);

    const myInvestments =
      (myInvestmentsResult as AggregateResult[])[0]?.total || 0;
    const currentBalance = lastFundTransaction?.balanceSnapshot || 0;

    return {
      // Personal Stats
      myInvestments,
      totalInvested: myInvestments,
      monthlyStats: myMonthlyStats,
      
      // Global Transparency (Role-based context)
      totalProjects,
      activeProjects,
      currentBalance,
      totalUsers,
      projectDistribution,

      // Recent Activity (User specific)
      recentDonations: await this.paymentModel
        .find({ userId: new Types.ObjectId(userId), paymentStatus: PaymentStatus.PAID })
        .sort({ createdAt: -1 })
        .limit(5)
    };
  }

  async getUserMonthlyStats(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const stats = await this.paymentModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          paymentStatus: PaymentStatus.PAID,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months: { month: string; year: number; amount: number; monthNum: number }[] = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        months.push({
            month: d.toLocaleString('default', { month: 'short' }),
            year: d.getFullYear(),
            amount: 0,
            monthNum: d.getMonth() + 1
        });
    }

    return months.map(m => {
        const found = stats.find(s => s._id.month === m.monthNum && s._id.year === m.year);
        return {
            name: m.month,
            amount: found ? found.amount : 0
        };
    });
  }
}
