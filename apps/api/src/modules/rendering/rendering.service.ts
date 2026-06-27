import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import type { Response, Request } from 'express';
import { QueueName, localMediaExists, saveLocalMedia, resolveLocalMediaPath } from '@acs/shared';
import { ProjectStatus, VideoStatus, WorkflowStatus, Prisma } from '@acs/database';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { VariationService } from './variation.service';
import { RealtimeGateway } from '../../gateways/realtime.gateway';

@Injectable()
export class RenderingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly variation: VariationService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async startRender(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
      include: {
        voiceArtifacts: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const voice = project.voiceArtifacts[0];
    await this.ensureVoiceFile(projectId, voice);

    const latestVideo = await this.prisma.video.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestVideo?.version ?? 0) + 1;

    const variationResult = await this.variation.generateRenderConfig(
      project.videoStyle,
    );

    const correlationId = uuidv4();

    const video = await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.RENDERING },
      });

      await tx.workflowExecution.updateMany({
        where: { projectId, status: WorkflowStatus.AWAITING_APPROVAL },
        data: { status: WorkflowStatus.RENDERING, currentStep: 'render' },
      });

      const createdVideo = await tx.video.create({
        data: {
          projectId,
          version: nextVersion,
          status: VideoStatus.QUEUED,
          templateVersionId: variationResult.templateVersionId,
        },
      });

      const renderConfig = await tx.renderConfig.create({
        data: {
          videoId: createdVideo.id,
          templateVersionId: variationResult.templateVersionId,
          variationSeed: variationResult.variationSeed,
          selectionsHash: variationResult.selectionsHash,
          selections: variationResult.selections as unknown as Prisma.InputJsonValue,
        },
      });

      return { video: createdVideo, renderConfig };
    });

    const job = await this.queueService.getQueue(QueueName.RENDER_VIDEO).add(
      'render',
      {
        jobId: uuidv4(),
        idempotencyKey: `render:${video.video.id}`,
        correlationId,
        projectId,
        workflowExecutionId: correlationId,
        videoId: video.video.id,
        renderConfigId: video.renderConfig.id,
        enqueuedAt: new Date().toISOString(),
      },
      { jobId: `render-${video.video.id}` },
    );

    await this.prisma.video.update({
      where: { id: video.video.id },
      data: { renderJobId: job.id, status: VideoStatus.RENDERING },
    });

    this.realtime.emitRenderProgress(projectId, { progress: 0 });

    return { video: video.video, renderConfig: video.renderConfig, jobId: job.id };
  }

  async retryRender(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
      include: { voiceArtifacts: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!project) throw new NotFoundException('Project not found');

    const voice = project.voiceArtifacts[0];
    await this.ensureVoiceFile(projectId, voice);

    const video = await this.prisma.video.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      include: { renderConfig: true },
    });
    if (!video?.renderConfig) {
      throw new BadRequestException('No render job found for this project');
    }

    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.RENDERING },
      }),
      this.prisma.video.update({
        where: { id: video.id },
        data: { status: VideoStatus.RENDERING },
      }),
      this.prisma.workflowExecution.updateMany({
        where: { projectId },
        data: { status: WorkflowStatus.RENDERING, currentStep: 'render', errorMessage: null },
      }),
    ]);

    const job = await this.queueService.getQueue(QueueName.RENDER_VIDEO).add(
      'render-retry',
      {
        jobId: uuidv4(),
        idempotencyKey: `render-retry:${video.id}:${Date.now()}`,
        correlationId: uuidv4(),
        projectId,
        workflowExecutionId: uuidv4(),
        videoId: video.id,
        renderConfigId: video.renderConfig.id,
        enqueuedAt: new Date().toISOString(),
      },
      { jobId: `render-retry-${video.id}-${Date.now()}` },
    );

    await this.prisma.video.update({
      where: { id: video.id },
      data: { renderJobId: job.id },
    });

    this.realtime.emitRenderProgress(projectId, { progress: 0 });
    return { videoId: video.id, jobId: job.id };
  }

  async getVideo(projectId: string, workspaceId: string) {
    await this.ensureProject(projectId, workspaceId);
    return this.prisma.video.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
      include: { renderConfig: true, subtitles: true },
    });
  }

  async streamVideo(
    projectId: string,
    videoId: string,
    workspaceId: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    await this.ensureProject(projectId, workspaceId);

    const video = await this.prisma.video.findFirst({
      where: { id: videoId, projectId },
    });
    if (!video) throw new NotFoundException('Video not found');

    const mediaKey = video.r2PathOptimized ?? video.r2PathRaw;
    if (!mediaKey || !localMediaExists(mediaKey)) {
      throw new NotFoundException(
        'Video file not found on disk. Click Retry render to regenerate it.',
      );
    }

    const filePath = resolveLocalMediaPath(mediaKey);
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    res.setHeader('Content-Type', video.mimeType ?? 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1]!, 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.setHeader('Content-Length', fileSize);
    fs.createReadStream(filePath).pipe(res);
  }

  private async ensureVoiceFile(
    projectId: string,
    voice: { r2Path: string } | undefined,
  ): Promise<void> {
    if (!voice?.r2Path) {
      throw new BadRequestException(
        'No voice artifact found. Regenerate the voice worker, then approve again.',
      );
    }

    if (localMediaExists(voice.r2Path)) return;

    const recovered = await this.recoverVoiceFromWorkerOutput(projectId, voice.r2Path);
    if (recovered) return;

    throw new BadRequestException(
      'Voice audio file is missing. Click "Regenerate voice", wait about 30 seconds, then approve again.',
    );
  }

  private async recoverVoiceFromWorkerOutput(
    projectId: string,
    r2Path: string,
  ): Promise<boolean> {
    const workflow = await this.prisma.workflowExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        workerExecutions: {
          where: { workerKey: 'voice', status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    const outputRef = workflow?.workerExecutions[0]?.outputRef;
    if (!outputRef || typeof outputRef !== 'object' || Array.isArray(outputRef)) {
      return false;
    }

    const audioBase64 = (outputRef as Record<string, unknown>).audioBase64;
    if (typeof audioBase64 !== 'string' || !audioBase64) {
      return false;
    }

    saveLocalMedia(r2Path, Buffer.from(audioBase64, 'base64'));
    return true;
  }

  private async ensureProject(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
