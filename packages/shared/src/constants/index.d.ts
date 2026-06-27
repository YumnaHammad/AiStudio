import { WorkerKey } from '../enums/index.js';
/** Canonical ordered list of AI worker steps in the pipeline */
export declare const WORKER_PIPELINE_ORDER: readonly WorkerKey[];
export interface PipelineOrderOptions {
    customScript?: boolean;
    costSaver?: boolean;
}
/** Pipeline steps for a project (skips AI script writers when user supplies a script). */
export declare function resolvePipelineOrder(options?: PipelineOrderOptions): readonly WorkerKey[];
/** Default primary provider per worker */
export declare const WORKER_DEFAULT_PROVIDERS: Record<WorkerKey, string>;
/** Cheaper providers when COST_SAVER_MODE=true */
export declare const COST_SAVER_PROVIDER_OVERRIDES: Partial<Record<WorkerKey, string>>;
/** Backup provider when primary fails after retries */
export declare const WORKER_BACKUP_PROVIDERS: Partial<Record<WorkerKey, string>>;
/** Default retry count before provider failover */
export declare const WORKER_MAX_RETRIES = 3;
/** Resolve which provider key to use for a worker step */
export declare function resolveWorkerProvider(
  workerKey: WorkerKey,
  attempt?: number,
  overrides?: Record<string, string>,
): string;
/** R2 storage path prefixes */
export declare const R2_PATH_PREFIX: {
    readonly VOICE: "voices";
    readonly VIDEO_RAW: "videos/raw";
    readonly VIDEO_OPTIMIZED: "videos/optimized";
    readonly THUMBNAIL: "thumbnails";
    readonly ASSET: "assets";
    readonly PODCAST: "podcasts";
    readonly SUBTITLE: "subtitles";
    readonly SOCIAL: "social";
    readonly LOGS: "logs";
};
/** WebSocket room prefixes */
export declare const WS_ROOM: {
    readonly PROJECT: "project";
    readonly WORKSPACE: "workspace";
    readonly USER: "user";
};
/** API route prefix */
export declare const API_VERSION = "v1";
export declare const API_PREFIX = "/api/v1";
//# sourceMappingURL=index.d.ts.map