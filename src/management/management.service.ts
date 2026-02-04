import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { Management } from './schemas/management.schema';
import {
  CreateManagementDto,
  ManagementQueryDto,
} from './dto/create-management.dto';
import { UpdateManagementDto } from './dto/update-management.dto';

import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ManagementService {
  constructor(
    @InjectModel(Management.name)
    private readonly managementModel: Model<Management>,
    private readonly redisService: RedisService,
  ) {}

  async create(createManagementDto: CreateManagementDto): Promise<Management> {
    const created = new this.managementModel(createManagementDto);
    const saved = await created.save();
    
    // 🧹 Invalidate Cache
    await this.redisService.delPattern('management:all*');
    
    return saved;
  }

  async findAll(
    query: ManagementQueryDto = {}, // 🔥 CRITICAL FIX
  ): Promise<{
    data: Management[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPage: number;
    };
  }> {
    // 🔍 Check Cache
    const cacheKey = `management:all:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached as any;

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = query;

    const skip = (page - 1) * limit;

    /* 🔍 Search */
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    /* ↕️ Sort */
    const sortCondition: Record<string, SortOrder> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      this.managementModel
        .find(filter)
        .populate('userId')
        .sort(sortCondition)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.managementModel.countDocuments(filter),
    ]);

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPage: Math.ceil(total / limit),
      },
    };

    // 💾 Set Cache
    await this.redisService.set(cacheKey, result, 600);
    
    return result;
  }

  async findOne(id: string): Promise<Management> {
    // 🔍 Check Cache
    const cacheKey = `management:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached as any;
  
    const management = await this.managementModel
      .findById(id)
      .populate('userId')
      .exec();

    if (!management) {
      throw new NotFoundException(`Management record with ID ${id} not found`);
    }
    
    // 💾 Set Cache
    await this.redisService.set(cacheKey, management, 1800);
    
    return management;
  }

  async update(
    id: string,
    updateDto: UpdateManagementDto,
  ): Promise<Management> {
    const updated = await this.managementModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Management record with ID ${id} not found`);
    }
    
    // 🧹 Invalidate Cache
    await this.redisService.del(`management:${id}`);
    await this.redisService.delPattern('management:all*');
    
    return updated;
  }

  async remove(id: string): Promise<Management> {
    const deleted = await this.managementModel
      .findByIdAndDelete(id)
      .exec();

    if (!deleted) {
      throw new NotFoundException(`Management record with ID ${id} not found`);
    }
    
    // 🧹 Invalidate Cache
    await this.redisService.del(`management:${id}`);
    await this.redisService.delPattern('management:all*');
    
    return deleted;
  }
}
