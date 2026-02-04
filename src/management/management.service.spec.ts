import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ManagementService } from './management.service';
import { Management } from './schemas/management.schema';
import { NotFoundException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

describe('ManagementService', () => {
  let service: ManagementService;
  let model: any;

  const mockManagement = {
    _id: '1',
    position: 'Manager',
  };

  const mockModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
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
        ManagementService,
        {
          provide: getModelToken(Management.name),
          useValue: mockModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ManagementService>(ManagementService);
    model = module.get(getModelToken(Management.name));
  });

  describe('findAll', () => {
    it('should return paginated result', async () => {
      mockModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockManagement]),
      });

      mockModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({
        data: [mockManagement],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPage: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return one record', async () => {
      mockModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockManagement),
      });

      const result = await service.findOne('1');
      expect(result).toEqual(mockManagement);
    });

    it('should throw if not found', async () => {
      mockModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });
});
