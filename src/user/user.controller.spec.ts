import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = [{ name: 'Test User' }];
      mockUserService.findAll.mockResolvedValue(result);

      expect(await controller.findAll({})).toBe(result);
    });
  });

  describe('updateMe', () => {
    it('should update current user profile', async () => {
      const result = { name: 'Updated' };
      mockUserService.update.mockResolvedValue(result);

      expect(
        await controller.updateMe({ user: { _id: 'id' } }, { name: 'Updated' }),
      ).toBe(result);
    });
  });
});
