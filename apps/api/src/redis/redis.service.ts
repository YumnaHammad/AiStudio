import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseRedisConnection } from '@acs/shared';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const options = parseRedisConnection(
      this.configService.get<string>('redis.url') ?? 'redis://localhost:6379',
    );

    this.client = new Redis({
      ...options,
      enableReadyCheck: true,
    });

    this.subscriber = new Redis({
      ...options,
      enableReadyCheck: true,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
  }
}
