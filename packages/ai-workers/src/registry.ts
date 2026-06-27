import { WorkerKey } from '@acs/shared';
import { IWorker } from './types';
import {
  ResearchWorker,
  FactCheckerWorker,
  ScriptWorker,
  TranslationWorker,
  VoiceWorker,
  ScenePlannerWorker,
  AssetFinderWorker,
  ThumbnailWorker,
  SeoWorker,
  PodcastWorker,
  SocialMediaWorker,
  QualityCheckWorker,
} from './workers';

const WORKER_INSTANCES: IWorker[] = [
  new ResearchWorker(),
  new FactCheckerWorker(),
  new ScriptWorker(),
  new TranslationWorker(),
  new VoiceWorker(),
  new ScenePlannerWorker(),
  new AssetFinderWorker(),
  new ThumbnailWorker(),
  new SeoWorker(),
  new PodcastWorker(),
  new SocialMediaWorker(),
  new QualityCheckWorker(),
];

const WORKER_MAP = new Map<WorkerKey, IWorker>(
  WORKER_INSTANCES.map((w) => [w.key, w]),
);

export function getWorker(key: WorkerKey): IWorker {
  const worker = WORKER_MAP.get(key);
  if (!worker) throw new Error(`Unknown worker: ${key}`);
  return worker;
}

export function getAllWorkers(): IWorker[] {
  return WORKER_INSTANCES;
}
