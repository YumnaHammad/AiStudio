import { WorkerKey } from '../enums/index.js';
/** Base shape for all BullMQ job payloads */
export interface BaseJobPayload {
    jobId: string;
    idempotencyKey: string;
    correlationId: string;
    projectId: string;
    workflowExecutionId: string;
    enqueuedAt: string;
}
/** AI worker job payload */
export interface AiWorkerJobPayload extends BaseJobPayload {
    workerKey: WorkerKey;
    workerExecutionId: string;
    attempt: number;
    providerOverride?: string;
}
/** Orchestrator advance-workflow job */
export interface OrchestratorJobPayload extends BaseJobPayload {
    step: WorkerKey | 'render' | 'publish';
    action: 'start' | 'advance' | 'retry' | 'resume';
}
/** Worker completion callback job */
export interface WorkerCompleteJobPayload extends BaseJobPayload {
    workerKey: WorkerKey;
    workerExecutionId: string;
    success: boolean;
    error?: string;
}
/** Render job payload */
export interface RenderJobPayload extends BaseJobPayload {
    videoId: string;
    renderConfigId: string;
}
/** Variable definition for prompt templates */
export interface PromptVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'json';
    required: boolean;
    description?: string;
    defaultValue?: unknown;
}
/** Scene subtitle cue */
export interface SubtitleCue {
    startMs: number;
    endMs: number;
    text: string;
}
/** Variation engine selection record */
export interface RenderVariationSelections {
    templateKey: string;
    layout: string;
    animation: string;
    transition: string;
    subtitleStyle: string;
    fontHeading: string;
    fontBody: string;
    intro: string;
    outro: string;
    background: string;
    imagePosition: string;
    cameraEffect: string;
    musicTrack: string;
    colorPalette: string;
}
/** Paginated API response wrapper */
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
/** Standard API error response */
export interface ApiErrorResponse {
    statusCode: number;
    error: string;
    message: string;
    correlationId?: string;
    details?: Record<string, unknown>;
}
//# sourceMappingURL=index.d.ts.map