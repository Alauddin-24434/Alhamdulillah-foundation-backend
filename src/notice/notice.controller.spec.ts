import { Test, TestingModule } from '@nestjs/testing';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

describe('NoticeController', () => {
  let controller: NoticeController;

  const mockNoticeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NoticeController],
      providers: [
        {
          provide: NoticeService,
          useValue: mockNoticeService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NoticeController>(NoticeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return notices', async () => {
      const result = [];
      mockNoticeService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
    });
  });
});
