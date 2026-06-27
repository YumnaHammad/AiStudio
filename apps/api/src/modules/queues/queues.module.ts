import { Module } from '@nestjs/common';
import { QueuesAdminService } from './queues-admin.service';
import { QueuesController } from './queues.controller';

@Module({
  controllers: [QueuesController],
  providers: [QueuesAdminService],
})
export class QueuesModule {}
