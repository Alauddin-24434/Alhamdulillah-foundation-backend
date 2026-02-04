import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { JwtAuthGuard } from './jwt-auth.guard';
import { User, UserSchema } from '../user/schemas/user.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StatsModule } from '../stats/stats.module';
import { Payment, PaymentSchema } from 'src/payment/schemas/payment.schema';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // ⭐ খুব জরুরি
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES') || '15m',
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
 

    StatsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // ⭐ Strategy register না হলে Guard কাজ করবে না
    JwtAuthGuard, // (optional) যদি DI দিয়ে কোথাও inject করো
  ],
  exports: [
    AuthService,
    PassportModule, // ⭐ অন্য module-এ guard ব্যবহার করতে
  ],
})
export class AuthModule {}
