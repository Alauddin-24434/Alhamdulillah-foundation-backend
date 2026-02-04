import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

@Schema({ timestamps: true })
export class Management extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  position: string;

  @Prop({ required: true })
  startAt: Date;

  @Prop()
  endAt: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const ManagementSchema = SchemaFactory.createForClass(Management);
