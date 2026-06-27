import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole, AuditAction } from '@acs/database';
import { WorkerKey } from '@acs/shared';
import { AuditService } from '../audit/audit.service';

@Controller('projects/:projectId/workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly orchestrator: OrchestratorService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  getWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.workflowService.getByProject(projectId, user.workspaceId);
  }

  @Get('logs/:workerExecutionId')
  getLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workerExecutionId', ParseUUIDPipe) workerExecutionId: string,
  ) {
    return this.workflowService.getWorkerLogs(workerExecutionId, user.workspaceId);
  }

  @Post('retry/:workerKey')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER)
  async retryWorker(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('workerKey') workerKey: WorkerKey,
  ) {
    await this.audit.log({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: AuditAction.WORKER_RETRIED,
      resource: 'worker',
      resourceId: projectId,
      metadata: { workerKey },
    });
    return this.orchestrator.retryWorker(projectId, user.workspaceId, workerKey);
  }
}
