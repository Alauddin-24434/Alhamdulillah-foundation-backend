import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProjectService } from './project.service';
import { Project } from './schemas/project.schema';
import { NotFoundException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockProject = {
    _id: '60d0fe4f5311236168a109ca',
    name: 'Test Project',
    createdBy: { _id: 'user1' },
    save: jest.fn(),
  };

  const mockProjectModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
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
        ProjectService,
        {
          provide: getModelToken(Project.name),
          useValue: mockProjectModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      mockProjectModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProject]),
      });
      mockProjectModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll();
      expect(result.data).toEqual([mockProject]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a project', async () => {
      mockProjectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.findOne('id');
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      mockProjectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });
  });
});
