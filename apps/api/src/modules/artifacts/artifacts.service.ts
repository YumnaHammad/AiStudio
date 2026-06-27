import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const ARTIFACT_MODEL_MAP = {
  research: 'researchArtifact',
  script: 'scriptArtifact',
  translation: 'translationArtifact',
  voice: 'voiceArtifact',
  scenes: 'scenePlan',
  assets: 'asset',
  thumbnail: 'thumbnailArtifact',
  seo: 'seoMetadata',
  podcast: 'podcastArtifact',
  social: 'socialPost',
} as const;

type ArtifactType = keyof typeof ARTIFACT_MODEL_MAP;

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

  async getArtifacts(
    projectId: string,
    workspaceId: string,
    type: string,
    version?: number,
  ) {
    await this.ensureProjectAccess(projectId, workspaceId);

    if (!this.isValidType(type)) {
      throw new BadRequestException(`Invalid artifact type: ${type}`);
    }

    switch (type as ArtifactType) {
      case 'research':
        return this.getVersioned(
          () => this.prisma.researchArtifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } }),
          () => this.prisma.researchArtifact.findUnique({ where: { projectId_version: { projectId, version: version! } } }),
          version,
        );
      case 'script':
        return this.getVersioned(
          () => this.prisma.scriptArtifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } }),
          () => this.prisma.scriptArtifact.findUnique({ where: { projectId_version: { projectId, version: version! } } }),
          version,
        );
      case 'translation':
        return this.getVersioned(
          () => this.prisma.translationArtifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } }),
          () => this.prisma.translationArtifact.findFirst({ where: { projectId, version } }),
          version,
        );
      case 'voice':
        return this.getVersioned(
          () => this.prisma.voiceArtifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } }),
          () => this.prisma.voiceArtifact.findUnique({ where: { projectId_version: { projectId, version: version! } } }),
          version,
        );
      case 'scenes':
        if (version) {
          return this.prisma.scenePlan.findUnique({
            where: { projectId_version: { projectId, version } },
            include: { scenes: { orderBy: { orderIndex: 'asc' }, include: { asset: true } } },
          });
        }
        return this.prisma.scenePlan.findMany({
          where: { projectId },
          orderBy: { version: 'desc' },
          include: { scenes: { orderBy: { orderIndex: 'asc' } }, _count: { select: { scenes: true } } },
        });
      case 'assets':
        return this.prisma.asset.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
      case 'thumbnail':
        return this.getVersioned(
          () => this.prisma.thumbnailArtifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } }),
          () => this.prisma.thumbnailArtifact.findUnique({ where: { projectId_version: { projectId, version: version! } } }),
          version,
        );
      case 'seo':
        return this.getVersioned(
          () => this.prisma.seoMetadata.findMany({ where: { projectId }, orderBy: { version: 'desc' } }),
          () => this.prisma.seoMetadata.findUnique({ where: { projectId_version: { projectId, version: version! } } }),
          version,
        );
      case 'podcast':
        return this.getVersioned(
          () => this.prisma.podcastArtifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } }),
          () => this.prisma.podcastArtifact.findUnique({ where: { projectId_version: { projectId, version: version! } } }),
          version,
        );
      case 'social':
        return this.prisma.socialPost.findMany({
          where: { projectId },
          orderBy: [{ platform: 'asc' }, { version: 'desc' }],
        });
      default:
        throw new BadRequestException(`Unsupported artifact type: ${type}`);
    }
  }

  private async getVersioned<T>(
    listFn: () => Promise<T[]>,
    oneFn: () => Promise<T | null>,
    version?: number,
  ) {
    if (version !== undefined) {
      const item = await oneFn();
      if (!item) throw new NotFoundException(`Artifact version ${version} not found`);
      return item;
    }
    return listFn();
  }

  private isValidType(type: string): type is ArtifactType {
    return type in ARTIFACT_MODEL_MAP;
  }

  private async ensureProjectAccess(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
