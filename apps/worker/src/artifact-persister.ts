import { PrismaClient, LogLevel, WorkerStatus, Prisma } from '@acs/database';
import { WorkerKey, R2_PATH_PREFIX, saveLocalMedia } from '@acs/shared';
import { WorkerResult } from '@acs/ai-workers';

export class ArtifactPersister {
  constructor(private readonly prisma: PrismaClient) {}

  async persist(
    workerKey: WorkerKey,
    projectId: string,
    workerExecutionId: string,
    result: WorkerResult,
  ): Promise<void> {
    const artifact = result.artifact;

    switch (workerKey) {
      case WorkerKey.RESEARCH: {
        const version = await this.nextVersion('researchArtifact', projectId);
        await this.prisma.researchArtifact.create({
          data: {
            projectId,
            version,
            content: artifact.content as Prisma.InputJsonValue,
            summary: (artifact.summary as string) ?? null,
            sourceCitations: [],
            workerExecutionId,
          },
        });
        break;
      }
      case WorkerKey.FACT_CHECKER: {
        const version = await this.nextVersion('researchArtifact', projectId);
        await this.prisma.researchArtifact.create({
          data: {
            projectId,
            version,
            content: (artifact.verifiedResearch ?? artifact) as Prisma.InputJsonValue,
            summary: `Fact-check score: ${artifact.score}`,
            workerExecutionId,
          },
        });
        break;
      }
      case WorkerKey.SCRIPT: {
        const version = await this.nextVersion('scriptArtifact', projectId);
        await this.prisma.scriptArtifact.create({
          data: {
            projectId,
            version,
            content: artifact.content as string,
            wordCount: (artifact.wordCount as number) ?? 0,
            sections: (artifact.sections ?? []) as Prisma.InputJsonValue,
            workerExecutionId,
          },
        });
        break;
      }
      case WorkerKey.TRANSLATION: {
        const version = await this.nextVersion('translationArtifact', projectId);
        await this.prisma.translationArtifact.create({
          data: {
            projectId,
            version,
            language: artifact.language as string,
            content: artifact.content as string,
            workerExecutionId,
          },
        });
        break;
      }
      case WorkerKey.VOICE: {
        const version = await this.nextVersion('voiceArtifact', projectId);
        const r2Path = `${R2_PATH_PREFIX.VOICE}/${projectId}/v${version}.mp3`;
        const audioBase64 = artifact.audioBase64 as string | undefined;
        if (audioBase64) {
          saveLocalMedia(r2Path, Buffer.from(audioBase64, 'base64'));
        }
        await this.prisma.voiceArtifact.create({
          data: {
            projectId,
            version,
            r2Path,
            durationMs: (artifact.durationMs as number) ?? 0,
            provider: result.provider,
            wordTimings: (artifact.wordTimings ?? []) as Prisma.InputJsonValue,
            workerExecutionId,
          },
        });
        artifact.r2Path = r2Path;
        break;
      }
      case WorkerKey.SCENE_PLANNER: {
        const version = await this.nextVersion('scenePlan', projectId);
        const plan = await this.prisma.scenePlan.create({
          data: {
            projectId,
            version,
            totalDurationMs: artifact.totalDurationMs as number,
            workerExecutionId,
          },
        });
        const scenes = artifact.scenes as Array<Record<string, unknown>>;
        for (let i = 0; i < scenes.length; i++) {
          const s = scenes[i]!;
          await this.prisma.scene.create({
            data: {
              scenePlanId: plan.id,
              orderIndex: i,
              narration: (s.narration as string) ?? '',
              durationMs: (s.durationMs as number) ?? 5000,
              subtitle: (s.subtitle ?? {}) as Prisma.InputJsonValue,
              animation: s.animation as string,
              transition: s.transition as string,
              layout: s.layout as string,
              cameraEffect: s.cameraEffect as string,
              background: (s.background ?? {}) as Prisma.InputJsonValue,
            },
          });
        }
        break;
      }
      case WorkerKey.ASSET_FINDER: {
        const resolved = artifact.resolvedAssets as Array<{ sceneIndex: number; asset: Record<string, unknown> }>;
        const scenePlan = await this.prisma.scenePlan.findFirst({
          where: { projectId },
          orderBy: { version: 'desc' },
          include: { scenes: { orderBy: { orderIndex: 'asc' } } },
        });

        for (const item of resolved ?? []) {
          const stockType = String(item.asset.type ?? 'image').toLowerCase();
          const created = await this.prisma.asset.create({
            data: {
              projectId,
              type: stockType === 'video' ? 'VIDEO' : 'IMAGE',
              source:
                item.asset.source === 'pixabay' || result.provider === 'pixabay'
                  ? 'PIXABAY'
                  : 'PEXELS',
              externalUrl: item.asset.url as string,
              externalId: item.asset.id as string,
              width: item.asset.width as number,
              height: item.asset.height as number,
              attribution: item.asset.photographer as string,
              metadata: { sceneIndex: item.sceneIndex } as Prisma.InputJsonValue,
            },
          });

          const scene = scenePlan?.scenes.find((s) => s.orderIndex === item.sceneIndex);
          if (scene) {
            await this.prisma.scene.update({
              where: { id: scene.id },
              data: { assetId: created.id },
            });
          }
        }
        break;
      }
      case WorkerKey.THUMBNAIL: {
        const version = await this.nextVersion('thumbnailArtifact', projectId);
        const r2Path = `${R2_PATH_PREFIX.THUMBNAIL}/${projectId}/v${version}.png`;
        const imageBase64 = artifact.imageBase64 as string | undefined;
        if (imageBase64) {
          saveLocalMedia(r2Path, Buffer.from(imageBase64, 'base64'));
        }
        await this.prisma.thumbnailArtifact.create({
          data: {
            projectId,
            version,
            r2Path,
            promptUsed: artifact.promptUsed as string,
            workerExecutionId,
          },
        });
        break;
      }
      case WorkerKey.SEO: {
        const version = await this.nextVersion('seoMetadata', projectId);
        await this.prisma.seoMetadata.create({
          data: {
            projectId,
            version,
            title: (artifact.title as string) ?? '',
            description: (artifact.description as string) ?? '',
            tags: (artifact.tags ?? []) as Prisma.InputJsonValue,
            chapters: (artifact.chapters ?? []) as Prisma.InputJsonValue,
            keywords: (artifact.keywords ?? []) as Prisma.InputJsonValue,
            workerExecutionId,
          },
        });
        break;
      }
      case WorkerKey.PODCAST: {
        const version = await this.nextVersion('podcastArtifact', projectId);
        await this.prisma.podcastArtifact.create({
          data: {
            projectId,
            version,
            r2Path: `${R2_PATH_PREFIX.PODCAST}/${projectId}/v${version}.mp3`,
            showNotes: artifact.showNotes as string,
            workerExecutionId,
          },
        });
        break;
      }
      case WorkerKey.SOCIAL_MEDIA: {
        const posts = artifact.posts as Array<Record<string, unknown>>;
        for (const post of posts ?? []) {
          const platform = String(post.platform ?? 'YOUTUBE').toUpperCase();
          const version = await this.nextSocialVersion(projectId, platform);
          await this.prisma.socialPost.create({
            data: {
              projectId,
              platform: platform as 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'X' | 'LINKEDIN' | 'FACEBOOK' | 'PINTEREST',
              version,
              content: (post.content as string) ?? '',
              hashtags: (post.hashtags ?? []) as Prisma.InputJsonValue,
              workerExecutionId,
            },
          });
        }
        break;
      }
      case WorkerKey.QUALITY_CHECK:
        break;
    }
  }

  private async nextVersion(
    model: 'researchArtifact' | 'scriptArtifact' | 'translationArtifact' | 'voiceArtifact' | 'scenePlan' | 'thumbnailArtifact' | 'seoMetadata' | 'podcastArtifact',
    projectId: string,
  ): Promise<number> {
    const counts: Record<string, () => Promise<number>> = {
      researchArtifact: () => this.prisma.researchArtifact.count({ where: { projectId } }),
      scriptArtifact: () => this.prisma.scriptArtifact.count({ where: { projectId } }),
      translationArtifact: () => this.prisma.translationArtifact.count({ where: { projectId } }),
      voiceArtifact: () => this.prisma.voiceArtifact.count({ where: { projectId } }),
      scenePlan: () => this.prisma.scenePlan.count({ where: { projectId } }),
      thumbnailArtifact: () => this.prisma.thumbnailArtifact.count({ where: { projectId } }),
      seoMetadata: () => this.prisma.seoMetadata.count({ where: { projectId } }),
      podcastArtifact: () => this.prisma.podcastArtifact.count({ where: { projectId } }),
    };
    return (await counts[model]!()) + 1;
  }

  private async nextSocialVersion(projectId: string, platform: string): Promise<number> {
    const count = await this.prisma.socialPost.count({
      where: { projectId, platform: platform as 'YOUTUBE' },
    });
    return count + 1;
  }
}

export async function logWorkerExecution(
  prisma: PrismaClient,
  workerExecutionId: string,
  logs: WorkerResult['logs'],
): Promise<void> {
  for (const log of logs) {
    await prisma.workerExecutionLog.create({
      data: {
        workerExecutionId,
        level: log.level as LogLevel,
        message: log.message,
        metadata: (log.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}

export async function markWorkerComplete(
  prisma: PrismaClient,
  workerExecutionId: string,
  result: WorkerResult,
): Promise<void> {
  await prisma.workerExecution.update({
    where: { id: workerExecutionId },
    data: {
      status: WorkerStatus.COMPLETED,
      outputRef: result.artifact as Prisma.InputJsonValue,
      costUsd: result.usage.costUsd,
      model: result.model,
      completedAt: new Date(),
    },
  });
}

export async function markWorkerFailed(
  prisma: PrismaClient,
  workerExecutionId: string,
  error: string,
): Promise<void> {
  await prisma.workerExecution.update({
    where: { id: workerExecutionId },
    data: {
      status: WorkerStatus.FAILED,
      errorMessage: error,
      completedAt: new Date(),
    },
  });
}
