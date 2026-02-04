import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;

  const mockUser = {
    _id: '60d0fe4f5311236168a109ca',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockUserModel = {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    exec: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      mockUserModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockUser]),
      });
      mockUserModel.countDocuments.mockReturnValue({
          exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll();
      // Since chain is fixed, let's assume it returns data array or {data, meta}
      // Reviewing UserService.findAll:
      // return { data, meta }
      
      expect(result.data).toEqual([mockUser]);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      const result = await service.update('id', { name: 'New Name' });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.update('id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUserModel.findByIdAndDelete.mockResolvedValue(mockUser);
      const result = await service.remove('id');
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.remove('id')).rejects.toThrow(NotFoundException);
    });
  });
});
