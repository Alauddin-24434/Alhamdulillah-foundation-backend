import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ versionKey: false, timestamps: true })
export class Notice extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ default: Date.now })
  date: Date;

  @Prop({ default: false })
  isActive: boolean;

  // 👇 who submitted
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submitBy: Types.ObjectId;
}

export const NoticeSchema = SchemaFactory.createForClass(Notice);
