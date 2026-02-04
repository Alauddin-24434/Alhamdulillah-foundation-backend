import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StatsService } from '../stats/stats.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    me: jest.fn(),
    refreshAccessToken: jest.fn(),
  };

  const mockStatsService = {
    getAdminStats: jest.fn(),
    getUserStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: StatsService, useValue: mockStatsService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return success and data on login', async () => {
      const loginResult = { user: {}, accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.login.mockResolvedValue(loginResult);

      const res = { cookie: jest.fn() } as any;
      const result = await controller.login(
        { email: 'test@example.com', password: 'password' },
        res,
      );

      expect(result.success).toBe(true);
      expect(res.cookie).toHaveBeenCalled();
    });
  });
});
