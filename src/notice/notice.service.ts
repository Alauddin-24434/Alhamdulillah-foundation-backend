import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notice } from './schemas/notice.schemas';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/create-notice.dto';

@Injectable()
export class NoticeService {
  constructor(
    @InjectModel(Notice.name)
    private readonly noticeModel: Model<Notice>,
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

    return notice;
  }

  // ================= UPDATE NOTICE =================
  async updateNotice(id: string, updateNoticeDto: UpdateNoticeDto) {
    const notice = await this.noticeModel.findById(id);
    if (!notice) throw new NotFoundException('Notice not found');

    Object.assign(notice, updateNoticeDto);
    await notice.save();

    return notice;
  }

  // ================= DELETE NOTICE =================
  async deleteNotice(id: string) {
    const notice = await this.noticeModel.findById(id);
    if (!notice) throw new NotFoundException('Notice not found');

    await this.noticeModel.deleteOne({ _id: id });

    return { message: 'Notice deleted successfully' };
  }

  // ================= GET ALL NOTICES =================
  async findAll() {
    return await this.noticeModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  // ================= GET SINGLE NOTICE =================
  async findOne(id: string) {
    const notice = await this.noticeModel.findById(id);
    if (!notice) throw new NotFoundException('Notice not found');
    
    return notice;
  }
}
