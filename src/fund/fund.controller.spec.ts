import { Test, TestingModule } from '@nestjs/testing';
import { FundController } from './fund.controller';
import { FundService } from './fund.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

describe('FundController', () => {
  let controller: FundController;
  let service: FundService;

  const mockFundService = {
    addTransaction: jest.fn(),
    getSummary: jest.fn(),
    getHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundController],
      providers: [
        {
          provide: FundService,
          useValue: mockFundService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FundController>(FundController);
    service = module.get<FundService>(FundService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should return summary', async () => {
      const result = { totalIncome: 100, totalExpense: 50, currentBalance: 50 };
      mockFundService.getSummary.mockResolvedValue(result);

      expect(await controller.getSummary()).toBe(result);
    });
  });
});
