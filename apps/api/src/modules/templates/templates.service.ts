import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(activeOnly = true) {
    return this.prisma.template.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        versions: {
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async findByKey(key: string) {
    const template = await this.prisma.template.findUnique({
      where: { key },
      include: {
        versions: { where: { isActive: true }, take: 1 },
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }
}
