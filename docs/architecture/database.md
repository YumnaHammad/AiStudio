# AI Content Studio — Database Architecture

## Overview

PostgreSQL is the single source of truth for all structured data. Media files live exclusively in Cloudflare R2; the database stores only `r2_path` references.

## Design Principles

1. **Project as aggregate root** — All content artifacts belong to a `Project`
2. **Immutable versioning** — Artifacts use `(project_id, version)` unique constraints; updates create new versions
3. **Workflow traceability** — Every AI output links to a `WorkerExecution` for cost, timing, and audit
4. **SaaS-ready tenancy** — `Organization → Workspace → Campaign → Project` hierarchy from day one
5. **Prompt externalization** — All AI prompts in `prompts` / `prompt_versions` tables, never in code

## Entity Groups

| Group | Tables | Purpose |
|-------|--------|---------|
| Tenancy | organizations, workspaces, users, workspace_members, refresh_tokens | Multi-tenant identity |
| Content | campaigns, projects, project_settings | User content hierarchy |
| Workflow | workflow_executions, worker_executions, worker_execution_logs | Pipeline state machine |
| Artifacts | research_artifacts, script_artifacts, translation_artifacts, voice_artifacts, scene_plans, scenes, assets, thumbnail_artifacts, seo_metadata, podcast_artifacts, social_posts | Versioned AI outputs |
| Rendering | templates, template_versions, videos, render_configs, subtitles | Remotion pipeline |
| Publishing | platform_connections, publish_records, analytics_snapshots | Social distribution |
| System | prompts, prompt_versions, api_keys, audit_logs, notifications, cost_ledger | Platform operations |

## Key Relationships

```
Campaign 1──* Project 1──* WorkflowExecution 1──* WorkerExecution
Project 1──* ScriptArtifact (versioned)
Project 1──* ScenePlan 1──* Scene *──0..1 Asset
Project 1──* Video 1──1 RenderConfig
Video 1──* PublishRecord 1──* AnalyticsSnapshot
```

## Indexing Strategy

- Dashboard queries: `worker_executions(status, created_at)`, `cost_ledger(workspace_id, recorded_at DESC)`
- Project views: `projects(campaign_id, status, created_at DESC)`
- Version lookups: `script_artifacts(project_id, version DESC)`
- Active prompts: `prompt_versions(prompt_id, is_active)`
