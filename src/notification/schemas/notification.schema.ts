import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, versionKey: false })
export class Notification {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: ['info', 'success', 'warning', 'error'], default: 'info' })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recipient: Types.ObjectId; // null for global notifications

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  link: string; // Optional link to redirect
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
