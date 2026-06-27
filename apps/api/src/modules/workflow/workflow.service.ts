import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getByProject(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.workflowExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        workerExecutions: {
          orderBy: { createdAt: 'asc' },
          include: {
            promptVersion: {
              select: { id: true, version: true, promptId: true },
            },
            _count: { select: { logs: true } },
          },
        },
      },
    });
  }

  async getWorkerLogs(workerExecutionId: string, workspaceId: string) {
    const execution = await this.prisma.workerExecution.findFirst({
      where: {
        id: workerExecutionId,
        workflowExecution: {
          project: { campaign: { workspaceId } },
        },
      },
    });
    if (!execution) throw new NotFoundException('Worker execution not found');

    return this.prisma.workerExecutionLog.findMany({
      where: { workerExecutionId },
      orderBy: { timestamp: 'asc' },
    });
  }
}
