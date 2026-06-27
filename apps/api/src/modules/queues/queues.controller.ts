import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { QueuesAdminService } from './queues-admin.service';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole } from '@acs/database';
import { IsIn, IsOptional, IsString } from 'class-validator';

class QueueJobsQueryDto {
  @IsOptional()
  @IsIn(['waiting', 'active', 'failed'])
  status?: 'waiting' | 'active' | 'failed';

  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesAdminService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  listQueues() {
    return this.queuesService.listQueues();
  }

  @Get(':name/jobs')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  listJobs(
    @Param('name') name: string,
    @Query() query: QueueJobsQueryDto,
  ) {
    return this.queuesService.listJobs(
      name,
      query.status ?? 'waiting',
      parseInt(query.start ?? '0', 10),
      parseInt(query.end ?? '20', 10),
    );
  }

  @Post(':name/jobs/:jobId/cancel')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  cancelJob(@Param('name') name: string, @Param('jobId') jobId: string) {
    return this.queuesService.cancelJob(name, jobId);
  }

  @Post(':name/jobs/:jobId/retry')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  retryJob(@Param('name') name: string, @Param('jobId') jobId: string) {
    return this.queuesService.retryJob(name, jobId);
  }
}
