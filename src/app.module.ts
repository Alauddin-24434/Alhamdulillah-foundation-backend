import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';

import { PaymentModule } from './payment/payment.module';
import { BannerModule } from './banner/banner.module';
import { UserModule } from './user/user.module';
import { StatsModule } from './stats/stats.module';
import { FundModule } from './fund/fund.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { NoticeModule } from './notice/notice.module';
import { ManagementModule } from './management/management.module';

import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') || 60,
          limit: config.get<number>('THROTTLE_LIMIT') || 10,
        },
      ],
    }),

    // Feature Modules
    AuthModule,
    UserModule,
    ProjectModule,
    PaymentModule,
    BannerModule,
    NoticeModule,
    StatsModule,
    FundModule,
    ManagementModule,

    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
