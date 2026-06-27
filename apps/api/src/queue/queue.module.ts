import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JobEnqueueService } from './job-enqueue.service';

@Global()
@Module({
  providers: [QueueService, JobEnqueueService],
  exports: [QueueService, JobEnqueueService],
})
export class QueueModule {}
