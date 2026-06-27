import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@acs/database';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  async findAll(workspaceId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        provider: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  }

  async create(workspaceId: string, userId: string, dto: CreateApiKeyDto) {
    const encryptedKey = this.encryption.encrypt(dto.key);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        workspaceId,
        provider: dto.provider,
        label: dto.label,
        encryptedKey,
      },
      select: {
        id: true,
        provider: true,
        label: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.API_KEY_CREATED,
      resource: 'api_key',
      resourceId: apiKey.id,
      metadata: { provider: dto.provider, label: dto.label },
    });

    return {
      ...apiKey,
      maskedKey: this.encryption.mask(dto.key),
    };
  }

  async remove(workspaceId: string, userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, workspaceId },
    });
    if (!key) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      workspaceId,
      userId,
      action: AuditAction.API_KEY_DELETED,
      resource: 'api_key',
      resourceId: id,
    });

    return { success: true };
  }

  async getDecryptedKey(workspaceId: string, provider: string): Promise<string | null> {
    const key = await this.prisma.apiKey.findFirst({
      where: { workspaceId, provider, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!key) return null;
    return this.encryption.decrypt(key.encryptedKey);
  }
}
