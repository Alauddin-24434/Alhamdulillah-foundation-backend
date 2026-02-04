import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NoticeService } from './notice.service';
import { Notice } from './schemas/notice.schemas';
import { RedisService } from 'src/redis/redis.service';

describe('NoticeService', () => {
  let service: NoticeService;

  const mockNotice = {
    _id: '60d0fe4f5311236168a109ca',
    title: 'Test Notice',
    content: 'Test Content',
    isActive: true,
  };

  const mockNoticeModel = {
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
        NoticeService,
        {
          provide: getModelToken(Notice.name),
          useValue: mockNoticeModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<NoticeService>(NoticeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active notices', async () => {
      mockNoticeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockNotice]),
      });

      const result = await service.findAll();
      expect(result).toEqual([mockNotice]);
    });
  });
});
