import type { WorkerOptions } from 'bullmq';

/** Idle polling defaults (5ms) burn Upstash free-tier quota with many workers. */
export const BULLMQ_WORKER_OPTIONS: Pick<WorkerOptions, 'drainDelay' | 'stalledInterval'> = {
  drainDelay: 3_000,
  stalledInterval: 60_000,
};
