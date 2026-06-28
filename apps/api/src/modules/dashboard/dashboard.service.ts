import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { CostTrackerService } from '../workflow/cost-tracker.service';
import { WorkerStatus } from '@acs/database';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly costTracker: CostTrackerService,
  ) {}

  async getSummary(workspaceId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      todayCost,
      renderingQueue,
      uploadQueue,
      activeWorkers,
      recentProjects,
      projectCounts,
      recentActivity,
    ] = await Promise.all([
      this.costTracker.getTodayCost(workspaceId),
      this.queueService.getQueueStats('render-video'),
      this.queueService.getQueueStats('upload-r2'),
      this.prisma.workerExecution.count({
        where: {
          status: { in: [WorkerStatus.RUNNING, WorkerStatus.QUEUED] },
          workflowExecution: {
            project: { campaign: { workspaceId } },
          },
        },
      }),
      this.prisma.project.findMany({
        where: { campaign: { workspaceId }, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          topic: true,
          status: true,
          updatedAt: true,
        },
      }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { campaign: { workspaceId }, deletedAt: null },
        _count: true,
      }),
      this.prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      todayCost,
      activeAiJobs: activeWorkers,
      renderingQueue: renderingQueue ?? { waiting: 0, active: 0 },
      uploadQueue: uploadQueue ?? { waiting: 0, active: 0 },
      queues: [renderingQueue, uploadQueue].filter(Boolean),
      recentProjects,
      projectCounts: Object.fromEntries(
        projectCounts.map((p) => [p.status, p._count]),
      ),
      recentActivity,
    };
  }
}
