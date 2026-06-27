import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('redis.url')!;

    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    this.subscriber = new Redis(url, {
      maxRetriesPerRequest: null,
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
