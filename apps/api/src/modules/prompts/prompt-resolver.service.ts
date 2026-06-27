import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkerKey } from '@acs/shared';

@Injectable()
export class PromptResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActivePrompt(workerKey: WorkerKey) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { workerKey },
      include: {
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!prompt?.versions[0]) {
      throw new NotFoundException(
        `No active prompt found for worker: ${workerKey}`,
      );
    }

    return {
      prompt,
      version: prompt.versions[0],
    };
  }

  interpolate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const jsonValue =
        typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), jsonValue);
    }

    result = result.replace(
      /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, varName: string, content: string) => {
        const val = variables[varName];
        return val !== undefined && val !== null && val !== '' ? content : '';
      },
    );

    return result;
  }
}
