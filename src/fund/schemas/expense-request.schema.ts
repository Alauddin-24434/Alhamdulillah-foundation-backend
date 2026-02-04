import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ExpenseRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class ExpenseRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ type: [String], default: [] })
  evidenceImages: string[];

  @Prop({
    type: String,
    enum: ExpenseRequestStatus,
    default: ExpenseRequestStatus.PENDING,
  })
  status: ExpenseRequestStatus;

  // 👥 List of admins who approved
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  approvals: Types.ObjectId[];

  // 👤 The final super admin who gave the green light
  @Prop({ type: Types.ObjectId, ref: 'User' })
  finalApprovedBy?: Types.ObjectId;

  @Prop({ type: String })
  rejectionReason?: string;
}

export const ExpenseRequestSchema =
  SchemaFactory.createForClass(ExpenseRequest);
