-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'RUNNING', 'AWAITING_APPROVAL', 'RENDERING', 'PUBLISHING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('CREATED', 'RUNNING', 'AWAITING_WORKER', 'AWAITING_APPROVAL', 'RENDERING', 'PUBLISHING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'QUEUED', 'RENDERING', 'OPTIMIZING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'QUEUED', 'UPLOADING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'AI_IMAGE');

-- CreateEnum
CREATE TYPE "AssetSource" AS ENUM ('PEXELS', 'PIXABAY', 'OPENAI', 'UPLOAD', 'GENERATED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('NEWS', 'FINANCE', 'EDUCATION', 'HISTORY', 'TRAVEL', 'PODCAST', 'MOTIVATIONAL', 'STORYTELLING');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WORKFLOW_STARTED', 'WORKFLOW_COMPLETED', 'WORKFLOW_FAILED', 'WORKER_COMPLETED', 'WORKER_FAILED', 'RENDER_COMPLETED', 'RENDER_FAILED', 'PUBLISH_COMPLETED', 'PUBLISH_FAILED', 'APPROVAL_REQUIRED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'PROJECT_CREATED', 'PROJECT_APPROVED', 'PROJECT_CANCELLED', 'WORKFLOW_RESUMED', 'WORKER_RETRIED', 'PROMPT_CREATED', 'PROMPT_VERSION_CREATED', 'PROMPT_ACTIVATED', 'PROMPT_ROLLBACK', 'API_KEY_CREATED', 'API_KEY_DELETED', 'PUBLISH_INITIATED', 'ROLE_CHANGED');

-- CreateEnum
CREATE TYPE "VideoPlatform" AS ENUM ('YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'PINTEREST', 'X', 'GENERIC');

-- CreateEnum
CREATE TYPE "VideoStyle" AS ENUM ('DOCUMENTARY', 'NEWS', 'EDUCATIONAL', 'STORYTELLING', 'MOTIVATIONAL', 'PODCAST');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'PINTEREST', 'X');

-- CreateEnum
CREATE TYPE "PlatformConnectionType" AS ENUM ('YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'PINTEREST', 'X');

-- CreateEnum
CREATE TYPE "SubtitleFormat" AS ENUM ('SRT', 'VTT', 'ASS');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "plan" VARCHAR(50) NOT NULL DEFAULT 'free',
    "stripe_customer_id" VARCHAR(255),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "topic" VARCHAR(500) NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "video_style" "VideoStyle",
    "platform" "VideoPlatform" NOT NULL DEFAULT 'GENERIC',
    "duration_target" INTEGER,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_settings" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "auto_approve" BOOLEAN NOT NULL DEFAULT false,
    "provider_overrides" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'CREATED',
    "current_step" VARCHAR(50),
    "correlation_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_executions" (
    "id" UUID NOT NULL,
    "workflow_execution_id" UUID NOT NULL,
    "worker_key" VARCHAR(50) NOT NULL,
    "status" "WorkerStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(50),
    "model" VARCHAR(100),
    "prompt_version_id" UUID,
    "input_ref" JSONB,
    "output_ref" JSONB,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "error_message" TEXT,
    "error_code" VARCHAR(100),
    "bull_job_id" VARCHAR(100),
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "worker_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_execution_logs" (
    "id" UUID NOT NULL,
    "worker_execution_id" UUID NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "source_citations" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "r2_path" VARCHAR(500),
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "script_artifact_id" UUID,
    "version" INTEGER NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "r2_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL DEFAULT 'audio/mpeg',
    "size_bytes" BIGINT,
    "duration_ms" INTEGER NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "voice_id" VARCHAR(100),
    "word_timings" JSONB NOT NULL DEFAULT '[]',
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_plans" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "total_duration_ms" INTEGER,
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" UUID NOT NULL,
    "scene_plan_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "narration" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "subtitle" JSONB NOT NULL DEFAULT '{}',
    "animation" VARCHAR(100),
    "transition" VARCHAR(100),
    "layout" VARCHAR(100),
    "camera_effect" VARCHAR(100),
    "background" JSONB NOT NULL DEFAULT '{}',
    "asset_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "AssetType" NOT NULL,
    "source" "AssetSource" NOT NULL,
    "r2_path" VARCHAR(500),
    "external_url" VARCHAR(1000),
    "external_id" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "size_bytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "license" VARCHAR(255),
    "attribution" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thumbnail_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "r2_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL DEFAULT 'image/png',
    "size_bytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "prompt_used" TEXT,
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thumbnail_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_metadata" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "chapters" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "podcast_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "r2_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL DEFAULT 'audio/mpeg',
    "size_bytes" BIGINT,
    "duration_ms" INTEGER,
    "show_notes" TEXT,
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "podcast_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "hashtags" JSONB NOT NULL DEFAULT '[]',
    "media_r2_path" VARCHAR(500),
    "worker_execution_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "template_version_id" UUID,
    "r2_path_raw" VARCHAR(500),
    "r2_path_optimized" VARCHAR(500),
    "mime_type" VARCHAR(100) NOT NULL DEFAULT 'video/mp4',
    "size_bytes" BIGINT,
    "duration_ms" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "render_job_id" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_configs" (
    "id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "variation_seed" VARCHAR(64) NOT NULL,
    "selections_hash" VARCHAR(64) NOT NULL,
    "selections" JSONB NOT NULL,
    "timeline_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtitles" (
    "id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "format" "SubtitleFormat" NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "r2_path" VARCHAR(500) NOT NULL,
    "cues" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtitles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_connections" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "platform" "PlatformConnectionType" NOT NULL,
    "account_name" VARCHAR(255),
    "encrypted_tokens" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_records" (
    "id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "platform_connection_id" UUID NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "platform_video_id" VARCHAR(255),
    "platform_url" VARCHAR(1000),
    "title" VARCHAR(255),
    "description" TEXT,
    "error_message" TEXT,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "publish_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" UUID NOT NULL,
    "publish_record_id" UUID NOT NULL,
    "captured_at" TIMESTAMPTZ NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "likes" BIGINT NOT NULL DEFAULT 0,
    "comments" BIGINT NOT NULL DEFAULT 0,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "watch_time_ms" BIGINT NOT NULL DEFAULT 0,
    "raw_data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" UUID NOT NULL,
    "worker_key" VARCHAR(50) NOT NULL,
    "purpose" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" UUID NOT NULL,
    "prompt_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_ledger" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "project_id" UUID,
    "worker_execution_id" UUID,
    "provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100),
    "operation" VARCHAR(100) NOT NULL,
    "units" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "unit_type" VARCHAR(50) NOT NULL,
    "amount_usd" DECIMAL(12,6) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "workspaces_organization_id_idx" ON "workspaces"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_organization_id_slug_key" ON "workspaces"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "campaigns_workspace_id_created_at_idx" ON "campaigns"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "projects_campaign_id_status_created_at_idx" ON "projects"("campaign_id", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_key" ON "project_settings"("project_id");

-- CreateIndex
CREATE INDEX "workflow_executions_project_id_created_at_idx" ON "workflow_executions"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "workflow_executions_status_created_at_idx" ON "workflow_executions"("status", "created_at");

-- CreateIndex
CREATE INDEX "workflow_executions_correlation_id_idx" ON "workflow_executions"("correlation_id");

-- CreateIndex
CREATE INDEX "worker_executions_workflow_execution_id_worker_key_idx" ON "worker_executions"("workflow_execution_id", "worker_key");

-- CreateIndex
CREATE INDEX "worker_executions_status_created_at_idx" ON "worker_executions"("status", "created_at");

-- CreateIndex
CREATE INDEX "worker_executions_worker_key_status_idx" ON "worker_executions"("worker_key", "status");

-- CreateIndex
CREATE INDEX "worker_execution_logs_worker_execution_id_timestamp_idx" ON "worker_execution_logs"("worker_execution_id", "timestamp");

-- CreateIndex
CREATE INDEX "research_artifacts_project_id_version_idx" ON "research_artifacts"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "research_artifacts_project_id_version_key" ON "research_artifacts"("project_id", "version");

-- CreateIndex
CREATE INDEX "script_artifacts_project_id_version_idx" ON "script_artifacts"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "script_artifacts_project_id_version_key" ON "script_artifacts"("project_id", "version");

-- CreateIndex
CREATE INDEX "translation_artifacts_project_id_version_idx" ON "translation_artifacts"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "translation_artifacts_project_id_language_version_key" ON "translation_artifacts"("project_id", "language", "version");

-- CreateIndex
CREATE INDEX "voice_artifacts_project_id_version_idx" ON "voice_artifacts"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "voice_artifacts_project_id_version_key" ON "voice_artifacts"("project_id", "version");

-- CreateIndex
CREATE INDEX "scene_plans_project_id_version_idx" ON "scene_plans"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "scene_plans_project_id_version_key" ON "scene_plans"("project_id", "version");

-- CreateIndex
CREATE INDEX "scenes_scene_plan_id_idx" ON "scenes"("scene_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_scene_plan_id_order_index_key" ON "scenes"("scene_plan_id", "order_index");

-- CreateIndex
CREATE INDEX "assets_project_id_type_idx" ON "assets"("project_id", "type");

-- CreateIndex
CREATE INDEX "thumbnail_artifacts_project_id_version_idx" ON "thumbnail_artifacts"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "thumbnail_artifacts_project_id_version_key" ON "thumbnail_artifacts"("project_id", "version");

-- CreateIndex
CREATE INDEX "seo_metadata_project_id_version_idx" ON "seo_metadata"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "seo_metadata_project_id_version_key" ON "seo_metadata"("project_id", "version");

-- CreateIndex
CREATE INDEX "podcast_artifacts_project_id_version_idx" ON "podcast_artifacts"("project_id", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "podcast_artifacts_project_id_version_key" ON "podcast_artifacts"("project_id", "version");

-- CreateIndex
CREATE INDEX "social_posts_project_id_idx" ON "social_posts"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_project_id_platform_version_key" ON "social_posts"("project_id", "platform", "version");

-- CreateIndex
CREATE UNIQUE INDEX "templates_key_key" ON "templates"("key");

-- CreateIndex
CREATE INDEX "template_versions_template_id_is_active_idx" ON "template_versions"("template_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_template_id_version_key" ON "template_versions"("template_id", "version");

-- CreateIndex
CREATE INDEX "videos_project_id_status_idx" ON "videos"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "videos_project_id_version_key" ON "videos"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "render_configs_video_id_key" ON "render_configs"("video_id");

-- CreateIndex
CREATE INDEX "render_configs_selections_hash_idx" ON "render_configs"("selections_hash");

-- CreateIndex
CREATE INDEX "subtitles_video_id_idx" ON "subtitles"("video_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_connections_workspace_id_platform_key" ON "platform_connections"("workspace_id", "platform");

-- CreateIndex
CREATE INDEX "publish_records_video_id_idx" ON "publish_records"("video_id");

-- CreateIndex
CREATE INDEX "publish_records_status_idx" ON "publish_records"("status");

-- CreateIndex
CREATE INDEX "analytics_snapshots_publish_record_id_captured_at_idx" ON "analytics_snapshots"("publish_record_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "prompts_worker_key_idx" ON "prompts"("worker_key");

-- CreateIndex
CREATE INDEX "prompt_versions_prompt_id_is_active_idx" ON "prompt_versions"("prompt_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_prompt_id_version_key" ON "prompt_versions"("prompt_id", "version");

-- CreateIndex
CREATE INDEX "api_keys_workspace_id_provider_idx" ON "api_keys"("workspace_id", "provider");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_timestamp_idx" ON "audit_logs"("workspace_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_timestamp_idx" ON "audit_logs"("action", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cost_ledger_workspace_id_recorded_at_idx" ON "cost_ledger"("workspace_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "cost_ledger_project_id_recorded_at_idx" ON "cost_ledger"("project_id", "recorded_at" DESC);

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_executions" ADD CONSTRAINT "worker_executions_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_executions" ADD CONSTRAINT "worker_executions_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_execution_logs" ADD CONSTRAINT "worker_execution_logs_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_artifacts" ADD CONSTRAINT "research_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_artifacts" ADD CONSTRAINT "research_artifacts_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_artifacts" ADD CONSTRAINT "script_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_artifacts" ADD CONSTRAINT "script_artifacts_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_artifacts" ADD CONSTRAINT "translation_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_artifacts" ADD CONSTRAINT "translation_artifacts_script_artifact_id_fkey" FOREIGN KEY ("script_artifact_id") REFERENCES "script_artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_artifacts" ADD CONSTRAINT "translation_artifacts_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_artifacts" ADD CONSTRAINT "voice_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_artifacts" ADD CONSTRAINT "voice_artifacts_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_plans" ADD CONSTRAINT "scene_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_plans" ADD CONSTRAINT "scene_plans_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_scene_plan_id_fkey" FOREIGN KEY ("scene_plan_id") REFERENCES "scene_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thumbnail_artifacts" ADD CONSTRAINT "thumbnail_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thumbnail_artifacts" ADD CONSTRAINT "thumbnail_artifacts_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "podcast_artifacts" ADD CONSTRAINT "podcast_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "podcast_artifacts" ADD CONSTRAINT "podcast_artifacts_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_configs" ADD CONSTRAINT "render_configs_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_configs" ADD CONSTRAINT "render_configs_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_platform_connection_id_fkey" FOREIGN KEY ("platform_connection_id") REFERENCES "platform_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_publish_record_id_fkey" FOREIGN KEY ("publish_record_id") REFERENCES "publish_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_worker_execution_id_fkey" FOREIGN KEY ("worker_execution_id") REFERENCES "worker_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
