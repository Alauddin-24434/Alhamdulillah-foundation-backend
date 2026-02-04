import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyPaymentDto {

  @IsNotEmpty()
  @IsString()
  transactionId: string;
}
