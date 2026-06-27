import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRole } from '@acs/database';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async listWorkspaceMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(workspaceId: string, email: string, role: UserRole) {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existing.id },
        },
      });
      if (membership) {
        throw new ConflictException('User is already a workspace member');
      }
      await this.prisma.workspaceMember.create({
        data: { workspaceId, userId: existing.id, role },
      });
      return { userId: existing.id, email: existing.email, role, invited: true };
    }

    const tempPassword = randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName: email.split('@')[0],
      },
    });

    await this.prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role },
    });

    return {
      userId: user.id,
      email: user.email,
      role,
      invited: true,
      temporaryPassword: tempPassword,
    };
  }
}
