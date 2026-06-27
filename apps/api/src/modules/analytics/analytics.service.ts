import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectAnalytics(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
    });
    if (!project) throw new NotFoundException('Project not found');

    const publishRecords = await this.prisma.publishRecord.findMany({
      where: { video: { projectId } },
      include: {
        platformConnection: { select: { platform: true } },
        analyticsSnapshots: { orderBy: { capturedAt: 'desc' } },
      },
    });

    const totals = publishRecords.reduce(
      (acc, record) => {
        const latest = record.analyticsSnapshots[0];
        if (latest) {
          acc.views += Number(latest.views);
          acc.likes += Number(latest.likes);
          acc.comments += Number(latest.comments);
          acc.shares += Number(latest.shares);
        }
        return acc;
      },
      { views: 0, likes: 0, comments: 0, shares: 0 },
    );

    return { publishRecords, totals };
  }
}
