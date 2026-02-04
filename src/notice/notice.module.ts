import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';

import { MongooseModule } from '@nestjs/mongoose';
import { Notice, NoticeSchema } from './schemas/notice.schemas';


@Module({
  imports: [
    //  mongodb model register
    MongooseModule.forFeature([{ name: Notice.name, schema: NoticeSchema }]),

  ],
  // route handler
  controllers: [NoticeController],
  // business logic
  providers: [NoticeService],
  // If other modules need NoticeService
  exports: [NoticeService],
})
export class NoticeModule {}
