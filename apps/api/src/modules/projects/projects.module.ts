import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { RenderingModule } from '../rendering/rendering.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    forwardRef(() => OrchestratorModule),
    forwardRef(() => RenderingModule),
    AuditModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
