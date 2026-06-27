import { Injectable } from '@nestjs/common';
import { Prisma } from '@acs/database';
import { PrismaService } from '../../database/prisma.service';

export interface CostEntryInput {
  workspaceId: string;
  projectId?: string;
  workerExecutionId?: string;
  provider: string;
  model?: string;
  operation: string;
  units: number;
  unitType: string;
  amountUsd: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CostTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: CostEntryInput) {
    const [ledgerEntry] = await Promise.all([
      this.prisma.costLedgerEntry.create({
        data: {
          workspaceId: entry.workspaceId,
          projectId: entry.projectId,
          workerExecutionId: entry.workerExecutionId,
          provider: entry.provider,
          model: entry.model,
          operation: entry.operation,
          units: entry.units,
          unitType: entry.unitType,
          amountUsd: entry.amountUsd,
          metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        },
      }),
      entry.workerExecutionId
        ? this.prisma.workerExecution.update({
            where: { id: entry.workerExecutionId },
            data: { costUsd: { increment: entry.amountUsd } },
          })
        : Promise.resolve(),
    ]);

    return ledgerEntry;
  }

  async getTodayCost(workspaceId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.prisma.costLedgerEntry.aggregate({
      where: {
        workspaceId,
        recordedAt: { gte: startOfDay },
      },
      _sum: { amountUsd: true },
    });

    return Number(result._sum.amountUsd ?? 0);
  }

  async getProjectCost(projectId: string): Promise<number> {
    const result = await this.prisma.costLedgerEntry.aggregate({
      where: { projectId },
      _sum: { amountUsd: true },
    });
    return Number(result._sum.amountUsd ?? 0);
  }
}
