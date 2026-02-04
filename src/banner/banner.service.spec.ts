import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BannerService } from './banner.service';
import { Banner } from './schemas/banner.schema';
import { RedisService } from 'src/redis/redis.service';

describe('BannerService', () => {
  let service: BannerService;

  const mockBanner = {
    _id: '60d0fe4f5311236168a109ca',
    title: 'Test Banner',
    isActive: true,
  };

  const mockBannerModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    exec: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BannerService,
        {
          provide: getModelToken(Banner.name),
          useValue: mockBannerModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BannerService>(BannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active banners', async () => {
      mockBannerModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockBanner]),
      });

      const result = await service.findAll();
      expect(result).toEqual([mockBanner]);
    });
  });

  describe('findOne', () => {
    it('should return a banner', async () => {
      mockBannerModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockBanner),
      });

      const result = await service.findOne('id');
      expect(result).toEqual(mockBanner);
    });
  });
});
