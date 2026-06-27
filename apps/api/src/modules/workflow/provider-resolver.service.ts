import { Injectable } from '@nestjs/common';
import {
  resolveWorkerProvider,
  WORKER_BACKUP_PROVIDERS,
  WorkerKey,
} from '@acs/shared';

@Injectable()
export class ProviderResolverService {
  resolvePrimary(workerKey: WorkerKey, overrides?: Record<string, string>): string {
    return resolveWorkerProvider(workerKey, 0, overrides);
  }

  resolveBackup(workerKey: WorkerKey): string | undefined {
    return WORKER_BACKUP_PROVIDERS[workerKey];
  }

  resolve(
    workerKey: WorkerKey,
    attempt: number,
    maxRetries: number,
    overrides?: Record<string, string>,
  ): string {
    if (attempt > maxRetries) {
      const backup = this.resolveBackup(workerKey);
      if (backup) return backup;
    }
    return resolveWorkerProvider(workerKey, attempt, overrides);
  }
}
