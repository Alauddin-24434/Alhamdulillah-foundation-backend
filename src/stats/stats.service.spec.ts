import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StatsService } from './stats.service';
import { User } from '../user/schemas/user.schema';
import { Project } from '../project/schemas/project.schema';
import { Payment } from '../payment/schemas/payment.schema';
import { FundTransaction } from '../fund/schemas/fund-transaction.schema';

describe('StatsService', () => {
  let service: StatsService;

  const mockUserModel: any = { countDocuments: jest.fn() };
  const mockProjectModel: any = { countDocuments: jest.fn(), aggregate: jest.fn() };
  const mockPaymentModel: any = { 
    aggregate: jest.fn(),
    find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
    }),
  };
  const mockFundModel: any = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Project.name), useValue: mockProjectModel },
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        {
          provide: getModelToken(FundTransaction.name),
          useValue: mockFundModel,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAdminStats', () => {
    it('should return combined admin stats', async () => {
      mockUserModel.countDocuments.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(10),
        then: jest
          .fn()
          .mockImplementation((onFulfilled) =>
            Promise.resolve(10).then(onFulfilled),
          ),
      }));
      mockProjectModel.countDocuments.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(5),
        then: jest
          .fn()
          .mockImplementation((onFulfilled) =>
            Promise.resolve(5).then(onFulfilled),
          ),
      }));
      
      // Mock aggregations
      mockProjectModel.aggregate.mockResolvedValue([]); // For project distribution
      
      mockPaymentModel.aggregate
          .mockResolvedValueOnce([{ total: 1000 }]) // For totalRaised (first call)
          .mockResolvedValueOnce([]); // For monthlyStats (second call)

      mockFundModel.findOne.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ balanceSnapshot: 500 }),
        then: jest
          .fn()
          .mockImplementation((onFulfilled) =>
            Promise.resolve({ balanceSnapshot: 500 }).then(onFulfilled),
          ),
      }));

      const stats = await service.getAdminStats();
      expect(stats.totalUsers).toBe(10);
      expect(stats.totalProjects).toBe(5);
      expect(stats.totalRaised).toBe(1000);
      expect(stats.currentBalance).toBe(500);
    });
  });
});
