import { Module, forwardRef } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { CostTrackerService } from './cost-tracker.service';
import { ProviderResolverService } from './provider-resolver.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => OrchestratorModule), AuditModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, CostTrackerService, ProviderResolverService],
  exports: [WorkflowService, CostTrackerService, ProviderResolverService],
})
export class WorkflowModule {}
