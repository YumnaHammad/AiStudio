import { Module, forwardRef } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { PromptsModule } from '../prompts/prompts.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { GatewaysModule } from '../../gateways/gateways.module';

@Module({
  imports: [
    PromptsModule,
    forwardRef(() => WorkflowModule),
    GatewaysModule,
  ],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
