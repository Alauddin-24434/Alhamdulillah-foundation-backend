import { IsBoolean, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(['info', 'success', 'warning', 'error'])
  @IsOptional()
  type?: string;

  @IsMongoId()
  @IsOptional()
  recipient?: string;

  @IsString()
  @IsOptional()
  link?: string;
}
