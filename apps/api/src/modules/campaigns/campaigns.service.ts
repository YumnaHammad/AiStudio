import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll(workspaceId: string, skip: number, take: number) {
    const where = { workspaceId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { _count: { select: { projects: true } } },
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(workspaceId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        _count: { select: { projects: true } },
        projects: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async update(workspaceId: string, id: string, dto: UpdateCampaignDto) {
    await this.ensureExists(workspaceId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: dto,
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.ensureExists(workspaceId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureExists(workspaceId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }
}
