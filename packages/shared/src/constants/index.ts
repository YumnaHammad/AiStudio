import { WorkerKey } from '../enums/index.js';

/** Canonical ordered list of AI worker steps in the pipeline */
export const WORKER_PIPELINE_ORDER: readonly WorkerKey[] = [
  WorkerKey.RESEARCH,
  WorkerKey.FACT_CHECKER,
  WorkerKey.SCRIPT,
  WorkerKey.TRANSLATION,
  WorkerKey.VOICE,
  WorkerKey.SCENE_PLANNER,
  WorkerKey.ASSET_FINDER,
  WorkerKey.THUMBNAIL,
  WorkerKey.SEO,
  WorkerKey.PODCAST,
  WorkerKey.SOCIAL_MEDIA,
  WorkerKey.QUALITY_CHECK,
] as const;

const CUSTOM_SCRIPT_SKIP: readonly WorkerKey[] = [
  WorkerKey.RESEARCH,
  WorkerKey.FACT_CHECKER,
  WorkerKey.SCRIPT,
  WorkerKey.TRANSLATION,
];

const COST_SAVER_SKIP: readonly WorkerKey[] = [
  WorkerKey.PODCAST,
  WorkerKey.SOCIAL_MEDIA,
];

export interface PipelineOrderOptions {
  customScript?: boolean;
  costSaver?: boolean;
}

/** Pipeline steps for a project (skips AI script writers when user supplies a script). */
export function resolvePipelineOrder(
  options: PipelineOrderOptions = {},
): readonly WorkerKey[] {
  let order: WorkerKey[] = [...WORKER_PIPELINE_ORDER];

  if (options.customScript) {
    order = order.filter((step) => !CUSTOM_SCRIPT_SKIP.includes(step));
  }

  if (options.costSaver ?? process.env.COST_SAVER_MODE === 'true') {
    order = order.filter((step) => !COST_SAVER_SKIP.includes(step));
  }

  return order;
}

/** Default primary provider per worker */
export const WORKER_DEFAULT_PROVIDERS: Record<WorkerKey, string> = {
  [WorkerKey.RESEARCH]: 'openai',
  [WorkerKey.FACT_CHECKER]: 'openai',
  [WorkerKey.SCRIPT]: 'openai',
  [WorkerKey.TRANSLATION]: 'openai',
  [WorkerKey.VOICE]: 'openai-tts',
  [WorkerKey.SCENE_PLANNER]: 'openai',
  [WorkerKey.ASSET_FINDER]: 'pexels',
  [WorkerKey.THUMBNAIL]: 'openai-images',
  [WorkerKey.SEO]: 'openai',
  [WorkerKey.PODCAST]: 'openai',
  [WorkerKey.SOCIAL_MEDIA]: 'openai',
  [WorkerKey.QUALITY_CHECK]: 'openai',
};

/** Cheaper providers when COST_SAVER_MODE=true (OpenAI-only billing where possible) */
export const COST_SAVER_PROVIDER_OVERRIDES: Partial<Record<WorkerKey, string>> = {
  [WorkerKey.VOICE]: 'openai-tts',
  [WorkerKey.ASSET_FINDER]: 'pexels',
};

/** Backup provider when primary fails after retries */
export const WORKER_BACKUP_PROVIDERS: Partial<Record<WorkerKey, string>> = {
  [WorkerKey.RESEARCH]: 'anthropic',
  [WorkerKey.FACT_CHECKER]: 'anthropic',
  [WorkerKey.SCRIPT]: 'anthropic',
  [WorkerKey.TRANSLATION]: 'anthropic',
  [WorkerKey.VOICE]: 'openai-tts',
  [WorkerKey.SCENE_PLANNER]: 'anthropic',
  [WorkerKey.ASSET_FINDER]: 'pixabay',
  [WorkerKey.SEO]: 'anthropic',
  [WorkerKey.PODCAST]: 'anthropic',
  [WorkerKey.SOCIAL_MEDIA]: 'anthropic',
  [WorkerKey.QUALITY_CHECK]: 'anthropic',
};

/** Default retry count before provider failover */
export const WORKER_MAX_RETRIES = 3;

/** Resolve which provider key to use for a worker step */
export function resolveWorkerProvider(
  workerKey: WorkerKey,
  attempt = 0,
  overrides?: Record<string, string>,
): string {
  if (overrides?.[workerKey]) return overrides[workerKey]!;
  if (
    process.env.COST_SAVER_MODE === 'true' &&
    COST_SAVER_PROVIDER_OVERRIDES[workerKey]
  ) {
    return COST_SAVER_PROVIDER_OVERRIDES[workerKey]!;
  }
  if (attempt > WORKER_MAX_RETRIES) {
    const backup = WORKER_BACKUP_PROVIDERS[workerKey];
    if (backup) return backup;
  }
  return WORKER_DEFAULT_PROVIDERS[workerKey];
}

/** R2 storage path prefixes */
export const R2_PATH_PREFIX = {
  VOICE: 'voices',
  VIDEO_RAW: 'videos/raw',
  VIDEO_OPTIMIZED: 'videos/optimized',
  THUMBNAIL: 'thumbnails',
  ASSET: 'assets',
  PODCAST: 'podcasts',
  SUBTITLE: 'subtitles',
  SOCIAL: 'social',
  LOGS: 'logs',
} as const;

/** WebSocket room prefixes */
export const WS_ROOM = {
  PROJECT: 'project',
  WORKSPACE: 'workspace',
  USER: 'user',
} as const;

/** API route prefix */
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
