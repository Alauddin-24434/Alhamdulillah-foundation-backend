import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from './schemas/banner.schema';
import { CreateBannerDto } from './dto/create-banner.dto';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<Banner>,
  ) {}

  async create(createBannerDto: CreateBannerDto) {
    const banner = new this.bannerModel(createBannerDto);
    return await banner.save();
  }

  async findAll() {
    return await this.bannerModel
      .find({ isActive: true })
      .sort({ displayOrder: 1 })
      .exec();
  }

  async findOne(id: string) {
    const banner = await this.bannerModel.findById(id).exec();

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async update(id: string, updateData: Partial<CreateBannerDto>) {
    const banner = await this.bannerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async remove(id: string) {
    const banner = await this.bannerModel.findByIdAndDelete(id).exec();

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }
}
