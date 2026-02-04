import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notice } from './schemas/notice.schemas';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/create-notice.dto';



import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class NoticeService {
  constructor(
    @InjectModel(Notice.name)
    private readonly noticeModel: Model<Notice>,
    private readonly redisService: RedisService,
  ) {}

  // ================= CREATE NOTICE =================
  async createNotice(createNoticeDto: CreateNoticeDto, userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const exists = await this.noticeModel.findOne({
      title: createNoticeDto.title,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      isActive: true,
    });

    if (exists) {
      throw new ConflictException('Notice already exists today');
    }

    const notice = await this.noticeModel.create({
      ...createNoticeDto,
      submitBy: userId,
    });



    // 🧹 Invalidate Cache
    await this.redisService.del('notices:all');

    return notice;
  }

  // ================= UPDATE NOTICE =================
  async updateNotice(id: string, updateNoticeDto: UpdateNoticeDto) {
    const notice = await this.noticeModel.findById(id);
    if (!notice) throw new NotFoundException('Notice not found');

    Object.assign(notice, updateNoticeDto);
    await notice.save();



    // 🧹 Invalidate Cache
    await this.redisService.del(`notices:${id}`);
    await this.redisService.del('notices:all');

    return notice;
  }

  // ================= DELETE NOTICE =================
  async deleteNotice(id: string) {
    const notice = await this.noticeModel.findById(id);
    if (!notice) throw new NotFoundException('Notice not found');

    await this.noticeModel.deleteOne({ _id: id });



    // 🧹 Invalidate Cache
    await this.redisService.del(`notices:${id}`);
    await this.redisService.del('notices:all');

    return { message: 'Notice deleted successfully' };
  }

  // ================= GET ALL NOTICES =================
  async findAll() {
    const cached = await this.redisService.get('notices:all');
    if (cached) return cached;

    const data = await this.noticeModel
      .find()
      .sort({ createdAt: -1 })
      .exec();

    await this.redisService.set('notices:all', data, 600); // 10 mins pass
    return data;
  }

  // ================= GET SINGLE NOTICE =================
  async findOne(id: string) {
    const cached = await this.redisService.get(`notices:${id}`);
    if (cached) return cached;
    
    const notice = await this.noticeModel.findById(id);
    if (!notice) throw new NotFoundException('Notice not found');
    
    await this.redisService.set(`notices:${id}`, notice, 600);
    return notice;
  }
}
