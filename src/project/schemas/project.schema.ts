import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ProjectStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  EXPIRED = 'expired',
}

@Schema({ _id: false })
export class ProjectMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  // 🔓 Dynamic role (no enum)
  @Prop({ required: true, trim: true })
  role: string;

  @Prop({ required: true, trim: true })
  responsibility: string;

  @Prop({ default: true })
  active: boolean;
}

export const ProjectMemberSchema = SchemaFactory.createForClass(ProjectMember);

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  thumbnail: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  videos: string[];

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ required: true })
  initialInvestment: number;

  @Prop({ default: 0 })
  memberCount: number;

  @Prop({ required: true })
  category: string;

  @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.UPCOMING })
  status: ProjectStatus;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  contactNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: [ProjectMemberSchema],
    default: [],
  })
  members: ProjectMember[];

  @Prop({ default: 0 })
  totalInvestment: number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Index for efficient queries
ProjectSchema.index({ status: 1, startDate: -1 });
ProjectSchema.index({ createdBy: 1 });
