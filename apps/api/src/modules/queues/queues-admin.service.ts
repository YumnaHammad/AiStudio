import { Injectable, NotFoundException } from '@nestjs/common';
import { QueueService } from '../../queue/queue.service';
import { JobEnqueueService } from '../../queue/job-enqueue.service';

@Injectable()
export class QueuesAdminService {
  constructor(
    private readonly queueService: QueueService,
    private readonly jobEnqueue: JobEnqueueService,
  ) {}

  async listQueues() {
    return this.queueService.getAllQueueStats();
  }

  async listJobs(queueName: string, status: 'waiting' | 'active' | 'failed' = 'waiting', start = 0, end = 20) {
    const queue = this.queueService.getQueue(queueName);

    const jobs =
      status === 'waiting'
        ? await queue.getWaiting(start, end)
        : status === 'active'
          ? await queue.getActive(start, end)
          : await queue.getFailed(start, end);

    return Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        state: await job.getState(),
      })),
    );
  }

  async cancelJob(queueName: string, jobId: string) {
    await this.jobEnqueue.cancelJob(queueName, jobId);
    return { success: true };
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = this.queueService.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    await job.retry();
    return { success: true };
  }
}
