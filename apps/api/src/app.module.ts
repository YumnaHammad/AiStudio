import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { GatewaysModule } from './gateways/gateways.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { StorageModule } from './modules/storage/storage.module';
import { RenderingModule } from './modules/rendering/rendering.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { QueuesModule } from './modules/queues/queues.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 300 },
    ]),
    DatabaseModule,
    RedisModule,
    QueueModule,
    GatewaysModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CampaignsModule,
    ProjectsModule,
    WorkflowModule,
    OrchestratorModule,
    PromptsModule,
    TemplatesModule,
    ArtifactsModule,
    StorageModule,
    RenderingModule,
    PublishingModule,
    AnalyticsModule,
    NotificationsModule,
    DashboardModule,
    QueuesModule,
    ApiKeysModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
