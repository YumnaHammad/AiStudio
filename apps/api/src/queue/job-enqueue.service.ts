import { Injectable } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  AiWorkerJobPayload,
  OrchestratorJobPayload,
  QueueName,
  WorkerKey,
} from '@acs/shared';
import { QueueService } from './queue.service';

@Injectable()
export class JobEnqueueService {
  constructor(private readonly queueService: QueueService) {}

  async enqueueOrchestrator(
    payload: Omit<OrchestratorJobPayload, 'jobId' | 'enqueuedAt'>,
    options?: JobsOptions,
  ) {
    const jobId = uuidv4();
    const fullPayload: OrchestratorJobPayload = {
      ...payload,
      jobId,
      enqueuedAt: new Date().toISOString(),
    };

    return this.queueService.getQueue(QueueName.ORCHESTRATOR).add(
      payload.action,
      fullPayload,
      {
        jobId,
        priority: 1,
        ...options,
      },
    );
  }

  async enqueueAiWorker(
    workerKey: WorkerKey,
    payload: Omit<AiWorkerJobPayload, 'jobId' | 'enqueuedAt' | 'workerKey'>,
    options?: JobsOptions,
  ) {
    const queueName = this.workerKeyToQueue(workerKey);
    const jobId = uuidv4();
    const fullPayload: AiWorkerJobPayload = {
      ...payload,
      workerKey,
      jobId,
      enqueuedAt: new Date().toISOString(),
    };

    return this.queueService.getQueue(queueName).add(
      workerKey,
      fullPayload,
      {
        jobId,
        ...options,
      },
    );
  }

  async cancelJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.queueService.getQueue(queueName).getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state === 'waiting' || state === 'delayed') {
        await job.remove();
      } else if (state === 'active') {
        await job.moveToFailed(new Error('Cancelled by user'), job.token ?? '0', true);
      }
    }
  }

  private workerKeyToQueue(workerKey: WorkerKey): QueueName {
    const map: Record<WorkerKey, QueueName> = {
      [WorkerKey.RESEARCH]: QueueName.AI_RESEARCH,
      [WorkerKey.FACT_CHECKER]: QueueName.AI_FACT_CHECKER,
      [WorkerKey.SCRIPT]: QueueName.AI_SCRIPT,
      [WorkerKey.TRANSLATION]: QueueName.AI_TRANSLATION,
      [WorkerKey.VOICE]: QueueName.AI_VOICE,
      [WorkerKey.SCENE_PLANNER]: QueueName.AI_SCENE_PLANNER,
      [WorkerKey.ASSET_FINDER]: QueueName.AI_ASSET_FINDER,
      [WorkerKey.THUMBNAIL]: QueueName.AI_THUMBNAIL,
      [WorkerKey.SEO]: QueueName.AI_SEO,
      [WorkerKey.PODCAST]: QueueName.AI_PODCAST,
      [WorkerKey.SOCIAL_MEDIA]: QueueName.AI_SOCIAL,
      [WorkerKey.QUALITY_CHECK]: QueueName.AI_QUALITY_CHECK,
    };
    return map[workerKey];
  }
}
