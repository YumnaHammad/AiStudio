import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@acs/database';
import { PrismaService } from '../../database/prisma.service';
import {
  CreatePromptDto,
  CreatePromptVersionDto,
  UpdatePromptDto,
} from './dto/prompt.dto';
import { PromptResolverService } from './prompt-resolver.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@acs/database';

@Injectable()
export class PromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promptResolver: PromptResolverService,
    private readonly audit: AuditService,
  ) {}

  async findAll(workerKey?: string) {
    return this.prisma.prompt.findMany({
      where: workerKey ? { workerKey } : undefined,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            isActive: true,
            createdAt: true,
            createdBy: true,
          },
        },
      },
      orderBy: { workerKey: 'asc' },
    });
  }

  async findOne(id: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: 'desc' } },
      },
    });
    if (!prompt) throw new NotFoundException('Prompt not found');
    return prompt;
  }

  async create(dto: CreatePromptDto, userId: string, workspaceId: string) {
    const prompt = await this.prisma.prompt.create({ data: dto });
    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.PROMPT_CREATED,
      resource: 'prompt',
      resourceId: prompt.id,
    });
    return prompt;
  }

  async update(id: string, dto: UpdatePromptDto) {
    await this.findOne(id);
    return this.prisma.prompt.update({ where: { id }, data: dto });
  }

  async createVersion(
    promptId: string,
    dto: CreatePromptVersionDto,
    userId: string,
    workspaceId: string,
  ) {
    await this.findOne(promptId);

    const latest = await this.prisma.promptVersion.findFirst({
      where: { promptId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const version = await this.prisma.promptVersion.create({
      data: {
        promptId,
        version: nextVersion,
        content: dto.content,
        variables: (dto.variables ?? []) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.PROMPT_VERSION_CREATED,
      resource: 'prompt_version',
      resourceId: version.id,
      metadata: { promptId, version: nextVersion },
    });

    return version;
  }

  async activateVersion(promptId: string, versionId: string, userId: string, workspaceId: string) {
    const version = await this.prisma.promptVersion.findFirst({
      where: { id: versionId, promptId },
    });
    if (!version) throw new NotFoundException('Prompt version not found');

    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({
        where: { promptId, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.promptVersion.update({
        where: { id: versionId },
        data: { isActive: true },
      }),
    ]);

    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.PROMPT_ACTIVATED,
      resource: 'prompt_version',
      resourceId: versionId,
    });

    return this.findOne(promptId);
  }

  async rollback(promptId: string, targetVersion: number, userId: string, workspaceId: string) {
    const version = await this.prisma.promptVersion.findUnique({
      where: { promptId_version: { promptId, version: targetVersion } },
    });
    if (!version) throw new NotFoundException('Target version not found');

    return this.activateVersion(promptId, version.id, userId, workspaceId);
  }

  async preview(promptId: string, versionId: string, variables: Record<string, unknown>) {
    const version = await this.prisma.promptVersion.findFirst({
      where: { id: versionId, promptId },
    });
    if (!version) throw new NotFoundException('Prompt version not found');

    return {
      rendered: this.promptResolver.interpolate(version.content, variables),
      variables: version.variables,
    };
  }
}
