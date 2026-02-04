import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const getRedisClient = (configService: ConfigService): Redis => {
  const redisUrl = configService.get<string>('REDIS_URL');
  
  if (!redisUrl) {
    throw new Error('REDIS_URL configuration is missing');
  }
  
  return new Redis(redisUrl);
};
