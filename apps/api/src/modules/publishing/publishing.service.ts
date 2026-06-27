import { Injectable, NotFoundException } from '@nestjs/common';
import { QueueName } from '@acs/shared';
import { PublishStatus } from '@acs/database';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async publishVideo(
    videoId: string,
    platformConnectionId: string,
    workspaceId: string,
  ) {
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        project: { campaign: { workspaceId } },
        status: 'COMPLETED',
      },
    });
    if (!video) throw new NotFoundException('Completed video not found');

    const connection = await this.prisma.platformConnection.findFirst({
      where: { id: platformConnectionId, workspaceId, isActive: true },
    });
    if (!connection) throw new NotFoundException('Platform connection not found');

    const record = await this.prisma.publishRecord.create({
      data: {
        videoId,
        platformConnectionId,
        status: PublishStatus.QUEUED,
      },
    });

    const job = await this.queueService.getQueue(QueueName.PUBLISH).add(
      'publish',
      {
        publishRecordId: record.id,
        videoId,
        platformConnectionId,
        workspaceId,
      },
      { jobId: `publish-${record.id}` },
    );

    return { publishRecord: record, jobId: job.id };
  }

  async getPublishRecords(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.publishRecord.findMany({
      where: { video: { projectId } },
      include: {
        platformConnection: { select: { platform: true, accountName: true } },
        analyticsSnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
