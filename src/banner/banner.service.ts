import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from './schemas/banner.schema';
import { CreateBannerDto } from './dto/create-banner.dto';

import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class BannerService {
  constructor(
      @InjectModel(Banner.name) private bannerModel: Model<Banner>,
      private readonly redisService: RedisService,
  ) {}

  async create(createBannerDto: CreateBannerDto) {
    const banner = new this.bannerModel(createBannerDto);
    const saved = await banner.save();
    
    // 🧹 Invalidate Cache
    await this.redisService.del('banners:active');
    
    return saved;
  }

  async findAll() {
    const cached = await this.redisService.get('banners:active');
    if (cached) return cached;

    const banners = await this.bannerModel
      .find({ isActive: true })
      .sort({ displayOrder: 1 })
      .exec();
    
    // 💾 Set Cache (TTL 30 mins)
    await this.redisService.set('banners:active', banners, 1800);
    
    return banners;
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
    
    // 🧹 Invalidate Cache
    await this.redisService.del('banners:active');

    return banner;
  }

  async remove(id: string) {
    const banner = await this.bannerModel.findByIdAndDelete(id).exec();

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    
    // 🧹 Invalidate Cache
    await this.redisService.del('banners:active');

    return banner;
  }
}
