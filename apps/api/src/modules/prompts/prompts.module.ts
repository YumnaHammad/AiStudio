import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { PromptResolverService } from './prompt-resolver.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PromptsController],
  providers: [PromptsService, PromptResolverService],
  exports: [PromptsService, PromptResolverService],
})
export class PromptsModule {}
