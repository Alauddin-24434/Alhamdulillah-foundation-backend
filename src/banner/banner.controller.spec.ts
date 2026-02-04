import { Test, TestingModule } from '@nestjs/testing';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

describe('BannerController', () => {
  let controller: BannerController;

  const mockBannerService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BannerController],
      providers: [
        {
          provide: BannerService,
          useValue: mockBannerService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BannerController>(BannerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return banners', async () => {
      const result = [];
      mockBannerService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
    });
  });
});
