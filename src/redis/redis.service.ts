import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL configuration is missing');
    }

    this.redisClient = new Redis(redisUrl);

    this.redisClient.on('connect', () => console.log('✅ Redis connected'));
    this.redisClient.on('error', (err) => console.error('❌ Redis error:', err));
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }

  /**
   * Get value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Set value in Redis with optional TTL (seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.set(key, stringValue, 'EX', ttl);
    } else {
      await this.redisClient.set(key, stringValue);
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /**
   * Delete all keys matching a pattern (e.g., "projects:*")
   * Uses SCAN for performance instead of KEYS
   */
  async delPattern(pattern: string): Promise<void> {
    const stream = this.redisClient.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', (keys: string[]) => {
      if (keys.length) {
        // Pipeline deletes for efficiency
        const pipeline = this.redisClient.pipeline();
        keys.forEach((key) => pipeline.del(key));
        pipeline.exec();
      }
    });

    return new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  }
}
