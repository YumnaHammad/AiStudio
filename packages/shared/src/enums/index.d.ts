/** Workspace-level roles for RBAC */
export declare enum UserRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
    EDITOR = "EDITOR",
    VIEWER = "VIEWER"
}
/** Project lifecycle status */
export declare enum ProjectStatus {
    DRAFT = "DRAFT",
    RUNNING = "RUNNING",
    AWAITING_APPROVAL = "AWAITING_APPROVAL",
    RENDERING = "RENDERING",
    PUBLISHING = "PUBLISHING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
/** Workflow execution status */
export declare enum WorkflowStatus {
    CREATED = "CREATED",
    RUNNING = "RUNNING",
    AWAITING_WORKER = "AWAITING_WORKER",
    AWAITING_APPROVAL = "AWAITING_APPROVAL",
    RENDERING = "RENDERING",
    PUBLISHING = "PUBLISHING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
/** Individual worker execution status */
export declare enum WorkerStatus {
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    SKIPPED = "SKIPPED"
}
/**
 * Ordered pipeline steps. Workers must complete in this sequence.
 * The orchestrator advances strictly one step at a time.
 */
export declare enum WorkerKey {
    RESEARCH = "research",
    FACT_CHECKER = "fact-checker",
    SCRIPT = "script",
    TRANSLATION = "translation",
    VOICE = "voice",
    SCENE_PLANNER = "scene-planner",
    ASSET_FINDER = "asset-finder",
    THUMBNAIL = "thumbnail",
    SEO = "seo",
    PODCAST = "podcast",
    SOCIAL_MEDIA = "social-media",
    QUALITY_CHECK = "quality-check"
}
/** Post-AI pipeline steps (not AI workers) */
export declare enum PipelineStep {
    RENDER = "render",
    FFMPEG_OPTIMIZE = "ffmpeg-optimize",
    PUBLISH = "publish",
    ANALYTICS_SYNC = "analytics-sync"
}
/** External AI / media provider identifiers */
export declare enum ProviderKey {
    OPENAI = "openai",
    ANTHROPIC = "anthropic",
    ELEVENLABS = "elevenlabs",
    OPENAI_TTS = "openai-tts",
    PEXELS = "pexels",
    PIXABAY = "pixabay",
    OPENAI_IMAGES = "openai-images"
}
/** Social publishing platforms */
export declare enum Platform {
    YOUTUBE = "youtube",
    FACEBOOK = "facebook",
    INSTAGRAM = "instagram",
    TIKTOK = "tiktok",
    LINKEDIN = "linkedin",
    PINTEREST = "pinterest",
    X = "x"
}
/** Video render status */
export declare enum VideoStatus {
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    RENDERING = "RENDERING",
    OPTIMIZING = "OPTIMIZING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
/** Publish job status */
export declare enum PublishStatus {
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    UPLOADING = "UPLOADING",
    PUBLISHED = "PUBLISHED",
    FAILED = "FAILED"
}
/** Asset source types */
export declare enum AssetType {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    AUDIO = "AUDIO",
    AI_IMAGE = "AI_IMAGE"
}
export declare enum AssetSource {
    PEXELS = "PEXELS",
    PIXABAY = "PIXABAY",
    OPENAI = "OPENAI",
    UPLOAD = "UPLOAD",
    GENERATED = "GENERATED"
}
/** BullMQ queue names */
export declare enum QueueName {
    ORCHESTRATOR = "orchestrator",
    ORCHESTRATOR_COMPLETE = "orchestrator-complete",
    AI_RESEARCH = "ai-research",
    AI_FACT_CHECKER = "ai-fact-checker",
    AI_SCRIPT = "ai-script",
    AI_TRANSLATION = "ai-translation",
    AI_VOICE = "ai-voice",
    AI_SCENE_PLANNER = "ai-scene-planner",
    AI_ASSET_FINDER = "ai-asset-finder",
    AI_THUMBNAIL = "ai-thumbnail",
    AI_SEO = "ai-seo",
    AI_PODCAST = "ai-podcast",
    AI_SOCIAL = "ai-social",
    AI_QUALITY_CHECK = "ai-quality-check",
    RENDER_VIDEO = "render-video",
    FFMPEG_OPTIMIZE = "ffmpeg-optimize",
    PUBLISH = "publish",
    UPLOAD_R2 = "upload-r2",
    ANALYTICS_SYNC = "analytics-sync",
    NOTIFICATIONS = "notifications"
}
/** Template categories for video styles */
export declare enum TemplateCategory {
    NEWS = "NEWS",
    FINANCE = "FINANCE",
    EDUCATION = "EDUCATION",
    HISTORY = "HISTORY",
    TRAVEL = "TRAVEL",
    PODCAST = "PODCAST",
    MOTIVATIONAL = "MOTIVATIONAL",
    STORYTELLING = "STORYTELLING"
}
/** Log levels for worker execution logs */
export declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR"
}
/** Notification types */
export declare enum NotificationType {
    WORKFLOW_STARTED = "WORKFLOW_STARTED",
    WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED",
    WORKFLOW_FAILED = "WORKFLOW_FAILED",
    WORKER_COMPLETED = "WORKER_COMPLETED",
    WORKER_FAILED = "WORKER_FAILED",
    RENDER_COMPLETED = "RENDER_COMPLETED",
    RENDER_FAILED = "RENDER_FAILED",
    PUBLISH_COMPLETED = "PUBLISH_COMPLETED",
    PUBLISH_FAILED = "PUBLISH_FAILED",
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED",
    SYSTEM = "SYSTEM"
}
/** Audit log action types */
export declare enum AuditAction {
    USER_LOGIN = "USER_LOGIN",
    USER_LOGOUT = "USER_LOGOUT",
    USER_CREATED = "USER_CREATED",
    USER_UPDATED = "USER_UPDATED",
    PROJECT_CREATED = "PROJECT_CREATED",
    PROJECT_APPROVED = "PROJECT_APPROVED",
    PROJECT_CANCELLED = "PROJECT_CANCELLED",
    WORKFLOW_RESUMED = "WORKFLOW_RESUMED",
    WORKER_RETRIED = "WORKER_RETRIED",
    PROMPT_CREATED = "PROMPT_CREATED",
    PROMPT_VERSION_CREATED = "PROMPT_VERSION_CREATED",
    PROMPT_ACTIVATED = "PROMPT_ACTIVATED",
    PROMPT_ROLLBACK = "PROMPT_ROLLBACK",
    API_KEY_CREATED = "API_KEY_CREATED",
    API_KEY_DELETED = "API_KEY_DELETED",
    PUBLISH_INITIATED = "PUBLISH_INITIATED",
    ROLE_CHANGED = "ROLE_CHANGED"
}
/** Supported video platforms for output targeting */
export declare enum VideoPlatform {
    YOUTUBE = "YOUTUBE",
    TIKTOK = "TIKTOK",
    INSTAGRAM = "INSTAGRAM",
    FACEBOOK = "FACEBOOK",
    LINKEDIN = "LINKEDIN",
    PINTEREST = "PINTEREST",
    X = "X",
    GENERIC = "GENERIC"
}
/** Video style preferences */
export declare enum VideoStyle {
    DOCUMENTARY = "DOCUMENTARY",
    NEWS = "NEWS",
    EDUCATIONAL = "EDUCATIONAL",
    STORYTELLING = "STORYTELLING",
    MOTIVATIONAL = "MOTIVATIONAL",
    PODCAST = "PODCAST"
}
/** Social post platforms (subset used in social_posts table) */
export declare enum SocialPlatform {
    YOUTUBE = "YOUTUBE",
    FACEBOOK = "FACEBOOK",
    INSTAGRAM = "INSTAGRAM",
    TIKTOK = "TIKTOK",
    LINKEDIN = "LINKEDIN",
    PINTEREST = "PINTEREST",
    X = "X"
}
//# sourceMappingURL=index.d.ts.map