import { WorkerKey } from '@acs/shared';
import { ProviderFactory } from '@acs/providers';
import { ProviderUsage } from '@acs/providers';

export interface ProjectParams {
  topic: string;
  language: string;
  videoStyle?: string | null;
  platform?: string | null;
  durationTarget?: number | null;
  customScript?: string | null;
}

export interface ResolvedPrompt {
  content: string;
  versionId: string;
  version: number;
}

export interface WorkerContext {
  projectId: string;
  workflowExecutionId: string;
  workerExecutionId: string;
  workerKey: WorkerKey;
  providerKey: string;
  project: ProjectParams;
  prompt: ResolvedPrompt;
  artifacts: Record<string, unknown>;
  providers: ProviderFactory;
}

export interface WorkerLogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface WorkerResult {
  success: boolean;
  artifact: Record<string, unknown>;
  usage: ProviderUsage;
  provider: string;
  model?: string;
  logs: WorkerLogEntry[];
  error?: string;
}

export interface IWorker {
  readonly key: WorkerKey;
  execute(ctx: WorkerContext): Promise<WorkerResult>;
}
