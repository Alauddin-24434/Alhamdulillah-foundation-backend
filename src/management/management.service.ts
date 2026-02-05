import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { Management } from './schemas/management.schema';
import {
  CreateManagementDto,
  ManagementQueryDto,
} from './dto/create-management.dto';
import { UpdateManagementDto } from './dto/update-management.dto';

@Injectable()
export class ManagementService {
  constructor(
    @InjectModel(Management.name)
    private readonly managementModel: Model<Management>,
  ) {}

  async create(createManagementDto: CreateManagementDto): Promise<Management> {
    const created = new this.managementModel(createManagementDto);
    return await created.save();
  }

  async findAll(
    query: ManagementQueryDto = {},
  ): Promise<{
    data: Management[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPage: number;
    };
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = query;

    const skip = (page - 1) * limit;

    /* Search */
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    /* Sort */
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

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Management> {
    const management = await this.managementModel
      .findById(id)
      .populate('userId')
      .exec();

    if (!management) {
      throw new NotFoundException(`Management record with ID ${id} not found`);
    }

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

    return updated;
  }

  async remove(id: string): Promise<Management> {
    const deleted = await this.managementModel
      .findByIdAndDelete(id)
      .exec();

    if (!deleted) {
      throw new NotFoundException(`Management record with ID ${id} not found`);
    }

    return deleted;
  }
}
