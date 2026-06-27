"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialPlatform = exports.VideoStyle = exports.VideoPlatform = exports.AuditAction = exports.NotificationType = exports.LogLevel = exports.TemplateCategory = exports.QueueName = exports.AssetSource = exports.AssetType = exports.PublishStatus = exports.VideoStatus = exports.Platform = exports.ProviderKey = exports.PipelineStep = exports.WorkerKey = exports.WorkerStatus = exports.WorkflowStatus = exports.ProjectStatus = exports.UserRole = void 0;
/** Workspace-level roles for RBAC */
var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["EDITOR"] = "EDITOR";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (exports.UserRole = UserRole = {}));
/** Project lifecycle status */
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "DRAFT";
    ProjectStatus["RUNNING"] = "RUNNING";
    ProjectStatus["AWAITING_APPROVAL"] = "AWAITING_APPROVAL";
    ProjectStatus["RENDERING"] = "RENDERING";
    ProjectStatus["PUBLISHING"] = "PUBLISHING";
    ProjectStatus["COMPLETED"] = "COMPLETED";
    ProjectStatus["FAILED"] = "FAILED";
    ProjectStatus["CANCELLED"] = "CANCELLED";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
/** Workflow execution status */
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["CREATED"] = "CREATED";
    WorkflowStatus["RUNNING"] = "RUNNING";
    WorkflowStatus["AWAITING_WORKER"] = "AWAITING_WORKER";
    WorkflowStatus["AWAITING_APPROVAL"] = "AWAITING_APPROVAL";
    WorkflowStatus["RENDERING"] = "RENDERING";
    WorkflowStatus["PUBLISHING"] = "PUBLISHING";
    WorkflowStatus["COMPLETED"] = "COMPLETED";
    WorkflowStatus["FAILED"] = "FAILED";
    WorkflowStatus["CANCELLED"] = "CANCELLED";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
/** Individual worker execution status */
var WorkerStatus;
(function (WorkerStatus) {
    WorkerStatus["PENDING"] = "PENDING";
    WorkerStatus["QUEUED"] = "QUEUED";
    WorkerStatus["RUNNING"] = "RUNNING";
    WorkerStatus["COMPLETED"] = "COMPLETED";
    WorkerStatus["FAILED"] = "FAILED";
    WorkerStatus["CANCELLED"] = "CANCELLED";
    WorkerStatus["SKIPPED"] = "SKIPPED";
})(WorkerStatus || (exports.WorkerStatus = WorkerStatus = {}));
/**
 * Ordered pipeline steps. Workers must complete in this sequence.
 * The orchestrator advances strictly one step at a time.
 */
var WorkerKey;
(function (WorkerKey) {
    WorkerKey["RESEARCH"] = "research";
    WorkerKey["FACT_CHECKER"] = "fact-checker";
    WorkerKey["SCRIPT"] = "script";
    WorkerKey["TRANSLATION"] = "translation";
    WorkerKey["VOICE"] = "voice";
    WorkerKey["SCENE_PLANNER"] = "scene-planner";
    WorkerKey["ASSET_FINDER"] = "asset-finder";
    WorkerKey["THUMBNAIL"] = "thumbnail";
    WorkerKey["SEO"] = "seo";
    WorkerKey["PODCAST"] = "podcast";
    WorkerKey["SOCIAL_MEDIA"] = "social-media";
    WorkerKey["QUALITY_CHECK"] = "quality-check";
})(WorkerKey || (exports.WorkerKey = WorkerKey = {}));
/** Post-AI pipeline steps (not AI workers) */
var PipelineStep;
(function (PipelineStep) {
    PipelineStep["RENDER"] = "render";
    PipelineStep["FFMPEG_OPTIMIZE"] = "ffmpeg-optimize";
    PipelineStep["PUBLISH"] = "publish";
    PipelineStep["ANALYTICS_SYNC"] = "analytics-sync";
})(PipelineStep || (exports.PipelineStep = PipelineStep = {}));
/** External AI / media provider identifiers */
var ProviderKey;
(function (ProviderKey) {
    ProviderKey["OPENAI"] = "openai";
    ProviderKey["ANTHROPIC"] = "anthropic";
    ProviderKey["ELEVENLABS"] = "elevenlabs";
    ProviderKey["OPENAI_TTS"] = "openai-tts";
    ProviderKey["PEXELS"] = "pexels";
    ProviderKey["PIXABAY"] = "pixabay";
    ProviderKey["OPENAI_IMAGES"] = "openai-images";
})(ProviderKey || (exports.ProviderKey = ProviderKey = {}));
/** Social publishing platforms */
var Platform;
(function (Platform) {
    Platform["YOUTUBE"] = "youtube";
    Platform["FACEBOOK"] = "facebook";
    Platform["INSTAGRAM"] = "instagram";
    Platform["TIKTOK"] = "tiktok";
    Platform["LINKEDIN"] = "linkedin";
    Platform["PINTEREST"] = "pinterest";
    Platform["X"] = "x";
})(Platform || (exports.Platform = Platform = {}));
/** Video render status */
var VideoStatus;
(function (VideoStatus) {
    VideoStatus["PENDING"] = "PENDING";
    VideoStatus["QUEUED"] = "QUEUED";
    VideoStatus["RENDERING"] = "RENDERING";
    VideoStatus["OPTIMIZING"] = "OPTIMIZING";
    VideoStatus["COMPLETED"] = "COMPLETED";
    VideoStatus["FAILED"] = "FAILED";
})(VideoStatus || (exports.VideoStatus = VideoStatus = {}));
/** Publish job status */
var PublishStatus;
(function (PublishStatus) {
    PublishStatus["PENDING"] = "PENDING";
    PublishStatus["QUEUED"] = "QUEUED";
    PublishStatus["UPLOADING"] = "UPLOADING";
    PublishStatus["PUBLISHED"] = "PUBLISHED";
    PublishStatus["FAILED"] = "FAILED";
})(PublishStatus || (exports.PublishStatus = PublishStatus = {}));
/** Asset source types */
var AssetType;
(function (AssetType) {
    AssetType["IMAGE"] = "IMAGE";
    AssetType["VIDEO"] = "VIDEO";
    AssetType["AUDIO"] = "AUDIO";
    AssetType["AI_IMAGE"] = "AI_IMAGE";
})(AssetType || (exports.AssetType = AssetType = {}));
var AssetSource;
(function (AssetSource) {
    AssetSource["PEXELS"] = "PEXELS";
    AssetSource["PIXABAY"] = "PIXABAY";
    AssetSource["OPENAI"] = "OPENAI";
    AssetSource["UPLOAD"] = "UPLOAD";
    AssetSource["GENERATED"] = "GENERATED";
})(AssetSource || (exports.AssetSource = AssetSource = {}));
/** BullMQ queue names */
var QueueName;
(function (QueueName) {
    QueueName["ORCHESTRATOR"] = "orchestrator";
    QueueName["ORCHESTRATOR_COMPLETE"] = "orchestrator-complete";
    QueueName["AI_RESEARCH"] = "ai-research";
    QueueName["AI_FACT_CHECKER"] = "ai-fact-checker";
    QueueName["AI_SCRIPT"] = "ai-script";
    QueueName["AI_TRANSLATION"] = "ai-translation";
    QueueName["AI_VOICE"] = "ai-voice";
    QueueName["AI_SCENE_PLANNER"] = "ai-scene-planner";
    QueueName["AI_ASSET_FINDER"] = "ai-asset-finder";
    QueueName["AI_THUMBNAIL"] = "ai-thumbnail";
    QueueName["AI_SEO"] = "ai-seo";
    QueueName["AI_PODCAST"] = "ai-podcast";
    QueueName["AI_SOCIAL"] = "ai-social";
    QueueName["AI_QUALITY_CHECK"] = "ai-quality-check";
    QueueName["RENDER_VIDEO"] = "render-video";
    QueueName["FFMPEG_OPTIMIZE"] = "ffmpeg-optimize";
    QueueName["PUBLISH"] = "publish";
    QueueName["UPLOAD_R2"] = "upload-r2";
    QueueName["ANALYTICS_SYNC"] = "analytics-sync";
    QueueName["NOTIFICATIONS"] = "notifications";
})(QueueName || (exports.QueueName = QueueName = {}));
/** Template categories for video styles */
var TemplateCategory;
(function (TemplateCategory) {
    TemplateCategory["NEWS"] = "NEWS";
    TemplateCategory["FINANCE"] = "FINANCE";
    TemplateCategory["EDUCATION"] = "EDUCATION";
    TemplateCategory["HISTORY"] = "HISTORY";
    TemplateCategory["TRAVEL"] = "TRAVEL";
    TemplateCategory["PODCAST"] = "PODCAST";
    TemplateCategory["MOTIVATIONAL"] = "MOTIVATIONAL";
    TemplateCategory["STORYTELLING"] = "STORYTELLING";
})(TemplateCategory || (exports.TemplateCategory = TemplateCategory = {}));
/** Log levels for worker execution logs */
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/** Notification types */
var NotificationType;
(function (NotificationType) {
    NotificationType["WORKFLOW_STARTED"] = "WORKFLOW_STARTED";
    NotificationType["WORKFLOW_COMPLETED"] = "WORKFLOW_COMPLETED";
    NotificationType["WORKFLOW_FAILED"] = "WORKFLOW_FAILED";
    NotificationType["WORKER_COMPLETED"] = "WORKER_COMPLETED";
    NotificationType["WORKER_FAILED"] = "WORKER_FAILED";
    NotificationType["RENDER_COMPLETED"] = "RENDER_COMPLETED";
    NotificationType["RENDER_FAILED"] = "RENDER_FAILED";
    NotificationType["PUBLISH_COMPLETED"] = "PUBLISH_COMPLETED";
    NotificationType["PUBLISH_FAILED"] = "PUBLISH_FAILED";
    NotificationType["APPROVAL_REQUIRED"] = "APPROVAL_REQUIRED";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/** Audit log action types */
var AuditAction;
(function (AuditAction) {
    AuditAction["USER_LOGIN"] = "USER_LOGIN";
    AuditAction["USER_LOGOUT"] = "USER_LOGOUT";
    AuditAction["USER_CREATED"] = "USER_CREATED";
    AuditAction["USER_UPDATED"] = "USER_UPDATED";
    AuditAction["PROJECT_CREATED"] = "PROJECT_CREATED";
    AuditAction["PROJECT_APPROVED"] = "PROJECT_APPROVED";
    AuditAction["PROJECT_CANCELLED"] = "PROJECT_CANCELLED";
    AuditAction["WORKFLOW_RESUMED"] = "WORKFLOW_RESUMED";
    AuditAction["WORKER_RETRIED"] = "WORKER_RETRIED";
    AuditAction["PROMPT_CREATED"] = "PROMPT_CREATED";
    AuditAction["PROMPT_VERSION_CREATED"] = "PROMPT_VERSION_CREATED";
    AuditAction["PROMPT_ACTIVATED"] = "PROMPT_ACTIVATED";
    AuditAction["PROMPT_ROLLBACK"] = "PROMPT_ROLLBACK";
    AuditAction["API_KEY_CREATED"] = "API_KEY_CREATED";
    AuditAction["API_KEY_DELETED"] = "API_KEY_DELETED";
    AuditAction["PUBLISH_INITIATED"] = "PUBLISH_INITIATED";
    AuditAction["ROLE_CHANGED"] = "ROLE_CHANGED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
/** Supported video platforms for output targeting */
var VideoPlatform;
(function (VideoPlatform) {
    VideoPlatform["YOUTUBE"] = "YOUTUBE";
    VideoPlatform["TIKTOK"] = "TIKTOK";
    VideoPlatform["INSTAGRAM"] = "INSTAGRAM";
    VideoPlatform["FACEBOOK"] = "FACEBOOK";
    VideoPlatform["LINKEDIN"] = "LINKEDIN";
    VideoPlatform["PINTEREST"] = "PINTEREST";
    VideoPlatform["X"] = "X";
    VideoPlatform["GENERIC"] = "GENERIC";
})(VideoPlatform || (exports.VideoPlatform = VideoPlatform = {}));
/** Video style preferences */
var VideoStyle;
(function (VideoStyle) {
    VideoStyle["DOCUMENTARY"] = "DOCUMENTARY";
    VideoStyle["NEWS"] = "NEWS";
    VideoStyle["EDUCATIONAL"] = "EDUCATIONAL";
    VideoStyle["STORYTELLING"] = "STORYTELLING";
    VideoStyle["MOTIVATIONAL"] = "MOTIVATIONAL";
    VideoStyle["PODCAST"] = "PODCAST";
})(VideoStyle || (exports.VideoStyle = VideoStyle = {}));
/** Social post platforms (subset used in social_posts table) */
var SocialPlatform;
(function (SocialPlatform) {
    SocialPlatform["YOUTUBE"] = "YOUTUBE";
    SocialPlatform["FACEBOOK"] = "FACEBOOK";
    SocialPlatform["INSTAGRAM"] = "INSTAGRAM";
    SocialPlatform["TIKTOK"] = "TIKTOK";
    SocialPlatform["LINKEDIN"] = "LINKEDIN";
    SocialPlatform["PINTEREST"] = "PINTEREST";
    SocialPlatform["X"] = "X";
})(SocialPlatform || (exports.SocialPlatform = SocialPlatform = {}));
//# sourceMappingURL=index.js.map