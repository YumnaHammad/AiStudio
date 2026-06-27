import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/project.dto';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { RenderingService } from '../rendering/rendering.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, ProjectStatus } from '@acs/database';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: OrchestratorService,
    private readonly rendering: RenderingService,
    private readonly audit: AuditService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateProjectDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: dto.campaignId, workspaceId, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const customScript = dto.customScript?.trim();

    const project = await this.prisma.project.create({
    data: {
      campaignId: dto.campaignId,
      topic: dto.topic,
      language: dto.language ?? 'en',
      videoStyle: dto.videoStyle,
      platform: dto.platform ?? 'GENERIC',
      durationTarget: this.resolveDurationTarget(dto.durationTarget),
      status: ProjectStatus.DRAFT,
      settings: {
        create: {
          autoApprove:
            dto.autoApprove ??
            process.env.COST_SAVER_AUTO_APPROVE === 'true',
          metadata: customScript ? { customScript } : {},
        },
      },
    },
    include: { settings: true, campaign: true },
    });

    if (customScript) {
      await this.prisma.scriptArtifact.create({
        data: {
          projectId: project.id,
          version: 1,
          content: customScript,
          wordCount: customScript.split(/\s+/).filter(Boolean).length,
          sections: [],
        },
      });
    }

    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.PROJECT_CREATED,
      resource: 'project',
      resourceId: project.id,
      metadata: { topic: dto.topic },
    });

    const workflow = await this.orchestrator.startWorkflow(project.id, workspaceId);

    return { project, workflow };
  }

  async findAll(
    workspaceId: string,
    skip: number,
    take: number,
    campaignId?: string,
    status?: ProjectStatus,
  ) {
    const where = {
      deletedAt: null,
      campaign: { workspaceId },
      ...(campaignId ? { campaignId } : {}),
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          campaign: { select: { id: true, name: true } },
          workflowExecutions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              currentStep: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(workspaceId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, campaign: { workspaceId }, deletedAt: null },
      include: {
        settings: true,
        campaign: true,
        workflowExecutions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            workerExecutions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        videos: { orderBy: { version: 'desc' }, take: 1 },
        scriptArtifacts: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async approve(workspaceId: string, userId: string, projectId: string) {
    const project = await this.findOne(workspaceId, projectId);

    if (project.status !== ProjectStatus.AWAITING_APPROVAL) {
      throw new BadRequestException('Project is not awaiting approval');
    }

    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.PROJECT_APPROVED,
      resource: 'project',
      resourceId: projectId,
    });

    return this.rendering.startRender(projectId, workspaceId);
  }

  async retryRender(workspaceId: string, userId: string, projectId: string) {
    await this.findOne(workspaceId, projectId);
    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.PROJECT_APPROVED,
      resource: 'project',
      resourceId: projectId,
    });
    return this.rendering.retryRender(projectId, workspaceId);
  }

  async cancel(workspaceId: string, userId: string, projectId: string) {
    await this.findOne(workspaceId, projectId);
    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.PROJECT_CANCELLED,
      resource: 'project',
      resourceId: projectId,
    });
    return this.orchestrator.cancelWorkflow(projectId, workspaceId);
  }

  async resume(workspaceId: string, userId: string, projectId: string) {
    await this.findOne(workspaceId, projectId);
    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.WORKFLOW_RESUMED,
      resource: 'project',
      resourceId: projectId,
    });
    return this.orchestrator.resumeWorkflow(projectId, workspaceId);
  }

  private resolveDurationTarget(requested?: number): number {
    const defaultSeconds = parseInt(process.env.DEFAULT_DURATION_SECONDS ?? '120', 10);
    const maxSeconds = parseInt(process.env.MAX_DURATION_SECONDS ?? '180', 10);
    const target = requested ?? defaultSeconds;
    return Math.min(Math.max(target, 30), maxSeconds);
  }
}
