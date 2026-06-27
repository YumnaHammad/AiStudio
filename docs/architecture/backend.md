# Backend Architecture — NestJS API

## Layered Request Flow

```
HTTP Request
  → CorrelationIdMiddleware
  → JwtAuthGuard + RolesGuard + ThrottlerGuard
  → Controller (DTO validation)
  → Service (business logic)
  → Repository / PrismaService
  → JobEnqueueService (async work)
  → Response via TransformInterceptor
```

## Module Map

| Module | Path Prefix | Responsibility |
|--------|-------------|----------------|
| AuthModule | `/auth` | Register, login, refresh, logout |
| UsersModule | `/users` | Profile, workspace members |
| OrganizationsModule | `/workspace` | Workspace + org info |
| CampaignsModule | `/campaigns` | Campaign CRUD |
| ProjectsModule | `/projects` | Project lifecycle, approve/cancel/resume |
| WorkflowModule | `/projects/:id/workflow` | Pipeline status, logs, retry |
| OrchestratorModule | (internal) | State machine, worker dispatch |
| PromptsModule | `/prompts` | Prompt library CRUD, versioning |
| TemplatesModule | `/templates` | Video template registry |
| ArtifactsModule | `/projects/:id/artifacts/:type` | Versioned AI outputs |
| StorageModule | `/storage` | R2 signed URLs |
| RenderingModule | `/projects/:id/videos` | Render job enqueue, variation |
| PublishingModule | `/videos/:id/publish` | Platform publish jobs |
| AnalyticsModule | `/projects/:id/analytics` | Performance metrics |
| DashboardModule | `/dashboard` | Aggregated ops view |
| QueuesModule | `/queues` | Queue admin (cancel, retry) |
| NotificationsModule | `/notifications` | In-app notifications |
| ApiKeysModule | `/settings/api-keys` | Encrypted provider keys |
| AuditModule | `/audit-logs` | Immutable audit trail |
| HealthModule | `/health` | Liveness + dependency checks |

## WebSocket

Namespace: `/realtime`

Events: `worker:status`, `workflow:step`, `render:progress`, `queue:update`, `cost:update`, `notification`

## Queue Integration

All 19 BullMQ queues registered in `QueueService`. Jobs enqueued via `JobEnqueueService` — never processed in HTTP handlers.

## Running

```bash
# Requires PostgreSQL, Redis, and .env
npm run api:dev
```

API: `http://localhost:4000/api/v1`  
Swagger: `http://localhost:4000/docs`
