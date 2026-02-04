import { Test, TestingModule } from '@nestjs/testing';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';

describe('ManagementController', () => {
  let controller: ManagementController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManagementController],
      providers: [
        {
          provide: ManagementService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ManagementController>(ManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAll', async () => {
    const result = { data: [], meta: {} };
    mockService.findAll.mockResolvedValue(result);

    expect(await controller.findAll({} as any)).toBe(result);
  });
});
