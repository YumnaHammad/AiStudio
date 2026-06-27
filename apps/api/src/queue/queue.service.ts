import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import { QueueName } from '@acs/shared';

const ALL_QUEUES: QueueName[] = Object.values(QueueName);

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();
  private readonly queueEvents = new Map<string, QueueEvents>();
  private readonly connection: ConnectionOptions;

  constructor(private readonly configService: ConfigService) {
    this.connection = this.parseRedisConnection(
      this.configService.get<string>('redis.url') ?? 'redis://localhost:6379',
    );

    for (const name of ALL_QUEUES) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      });
      this.queues.set(name, queue);

      const events = new QueueEvents(name, { connection: this.connection });
      this.queueEvents.set(name, events);
    }
  }

  getConnection(): ConnectionOptions {
    return this.connection;
  }

  getQueue(name: QueueName | string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue not found: ${name}`);
    }
    return queue;
  }

  getQueueEvents(name: QueueName | string): QueueEvents {
    const events = this.queueEvents.get(name);
    if (!events) {
      throw new Error(`Queue events not found: ${name}`);
    }
    return events;
  }

  getAllQueueNames(): string[] {
    return [...this.queues.keys()];
  }

  async getQueueStats(name: string) {
    const queue = this.getQueue(name);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { name, waiting, active, completed, failed, delayed };
  }

  async getAllQueueStats() {
    return Promise.all(
      this.getAllQueueNames().map((name) => this.getQueueStats(name)),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      ...[...this.queues.values()].map((q) => q.close()),
      ...[...this.queueEvents.values()].map((e) => e.close()),
    ]);
  }

  private parseRedisConnection(url: string): ConnectionOptions {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      maxRetriesPerRequest: null,
    };
  }
}
