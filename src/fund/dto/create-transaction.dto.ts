import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
} from 'class-validator';
import { TransactionType } from '../schemas/fund-transaction.schema';

export class CreateFundTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  // 🧾 Evidence image URLs (optional)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  // অথবা strict হলে:
  // @IsUrl({}, { each: true })
  evidenceImages?: string[];
}
