import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../user/schemas/user.schema';
import { Payment } from '../payment/schemas/payment.schema';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    _id: '60d0fe4f5311236168a109ca',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'GUEST',
    permissions: [],
    comparePassword: jest.fn(),
    save: jest.fn(),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    new: jest.fn().mockReturnValue(mockUser),
    constructor: jest.fn().mockReturnValue(mockUser),
  };

  const mockPaymentModel = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('token'),
    verify: jest.fn().mockReturnValue({ _id: 'id' }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens if credentials are valid', async () => {
      mockUserModel.findOne.mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser)
      });
      mockUser.comparePassword.mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserModel.findOne.mockReturnValue({
          select: jest.fn().mockResolvedValue(null)
      });
      await expect(
        service.login({ email: 'wrong@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should register a new user', () => {
      mockUserModel.findOne.mockResolvedValue(null);
      // Mocking the constructor and save
      function MockModel() {}
      MockModel.prototype.save = jest.fn().mockResolvedValue(mockUser);
      // This is a bit tricky with class-based models, but for unit testing logic:
    });
  });
});
