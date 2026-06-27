import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  WORKER_PIPELINE_ORDER,
  WorkerKey,
  WORKER_MAX_RETRIES,
  resolvePipelineOrder,
} from '@acs/shared';
import {
  ProjectStatus,
  WorkflowStatus,
  WorkerStatus,
} from '@acs/database';
import { PrismaService } from '../../database/prisma.service';
import { JobEnqueueService } from '../../queue/job-enqueue.service';
import { PromptResolverService } from '../prompts/prompt-resolver.service';
import { ProviderResolverService } from '../workflow/provider-resolver.service';
import { RealtimeGateway } from '../../gateways/realtime.gateway';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobEnqueue: JobEnqueueService,
    private readonly promptResolver: PromptResolverService,
    private readonly providerResolver: ProviderResolverService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async startWorkflow(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        campaign: { workspaceId },
        deletedAt: null,
      },
      include: { settings: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    const metadata = (project.settings?.metadata ?? {}) as { customScript?: string };
    const pipelineOrder = resolvePipelineOrder({
      customScript: !!metadata.customScript?.trim(),
    });
    const firstStep = pipelineOrder[0]!;

    const correlationId = uuidv4();

    const workflow = await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.RUNNING },
      });

      return tx.workflowExecution.create({
        data: {
          projectId,
          status: WorkflowStatus.RUNNING,
          currentStep: firstStep,
          correlationId,
          startedAt: new Date(),
        },
      });
    });

    await this.dispatchWorker(
      workflow.id,
      projectId,
      correlationId,
      firstStep,
      project.settings?.providerOverrides as Record<string, string> | undefined,
    );

    this.realtime.emitWorkflowUpdate(projectId, {
      status: WorkflowStatus.RUNNING,
      currentStep: firstStep,
    });

    return workflow;
  }

  async advanceWorkflow(
    workflowExecutionId: string,
    completedWorkerKey: WorkerKey,
  ) {
    const workflow = await this.prisma.workflowExecution.findUnique({
      where: { id: workflowExecutionId },
      include: {
        project: { include: { settings: true, campaign: true } },
      },
    });

    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.status === WorkflowStatus.CANCELLED) return;

    const metadata = (workflow.project.settings?.metadata ?? {}) as {
      customScript?: string;
    };
    const pipelineOrder = resolvePipelineOrder({
      customScript: !!metadata.customScript?.trim(),
    });

    const currentIndex = pipelineOrder.indexOf(completedWorkerKey);
    const nextStep = pipelineOrder[currentIndex + 1];

    if (!nextStep) {
      await this.completeAiPipeline(workflow);
      return;
    }

    await this.prisma.workflowExecution.update({
      where: { id: workflowExecutionId },
      data: {
        currentStep: nextStep,
        status: WorkflowStatus.AWAITING_WORKER,
      },
    });

    await this.dispatchWorker(
      workflowExecutionId,
      workflow.projectId,
      workflow.correlationId,
      nextStep,
      workflow.project.settings?.providerOverrides as Record<string, string> | undefined,
    );

    this.realtime.emitWorkflowUpdate(workflow.projectId, {
      status: WorkflowStatus.AWAITING_WORKER,
      currentStep: nextStep,
    });
  }

  async handleWorkerFailure(
    workflowExecutionId: string,
    workerExecutionId: string,
    workerKey: WorkerKey,
    error: string,
  ) {
    const workerExecution = await this.prisma.workerExecution.findUnique({
      where: { id: workerExecutionId },
      include: {
        workflowExecution: {
          include: { project: { include: { settings: true } } },
        },
      },
    });

    if (!workerExecution) return;

    if (workerExecution.retryCount < workerExecution.maxRetries) {
      await this.prisma.workerExecution.update({
        where: { id: workerExecutionId },
        data: {
          retryCount: { increment: 1 },
          status: WorkerStatus.QUEUED,
          errorMessage: error,
        },
      });

      await this.dispatchWorker(
        workflowExecutionId,
        workerExecution.workflowExecution.projectId,
        workerExecution.workflowExecution.correlationId,
        workerKey,
        workerExecution.workflowExecution.project.settings?.providerOverrides as Record<string, string> | undefined,
        workerExecution.retryCount + 1,
        workerExecutionId,
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.workerExecution.update({
        where: { id: workerExecutionId },
        data: { status: WorkerStatus.FAILED, errorMessage: error },
      }),
      this.prisma.workflowExecution.update({
        where: { id: workflowExecutionId },
        data: {
          status: WorkflowStatus.FAILED,
          errorMessage: `Worker ${workerKey} failed: ${error}`,
        },
      }),
      this.prisma.project.update({
        where: { id: workerExecution.workflowExecution.projectId },
        data: { status: ProjectStatus.FAILED },
      }),
    ]);

    this.realtime.emitWorkflowUpdate(
      workerExecution.workflowExecution.projectId,
      { status: WorkflowStatus.FAILED, error },
    );
  }

  async retryWorker(projectId: string, workspaceId: string, workerKey: WorkerKey) {
    const workflow = await this.getLatestWorkflow(projectId, workspaceId);
    if (!workflow) throw new NotFoundException('Workflow not found');

    const workerExecution = await this.prisma.workerExecution.findFirst({
      where: { workflowExecutionId: workflow.id, workerKey },
      orderBy: { createdAt: 'desc' },
    });

    if (!workerExecution) {
      throw new BadRequestException(`No execution found for worker: ${workerKey}`);
    }

    await this.prisma.workerExecution.update({
      where: { id: workerExecution.id },
      data: {
        status: WorkerStatus.QUEUED,
        retryCount: 0,
        errorMessage: null,
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { settings: true },
    });

    await this.dispatchWorker(
      workflow.id,
      projectId,
      workflow.correlationId,
      workerKey,
      project?.settings?.providerOverrides as Record<string, string> | undefined,
      0,
      workerExecution.id,
    );

    return workerExecution;
  }

  async resumeWorkflow(projectId: string, workspaceId: string) {
    const workflow = await this.getLatestWorkflow(projectId, workspaceId);
    if (!workflow) throw new NotFoundException('Workflow not found');

    if (workflow.status !== WorkflowStatus.FAILED) {
      throw new BadRequestException('Only failed workflows can be resumed');
    }

    const step = (workflow.currentStep as WorkerKey) ?? WORKER_PIPELINE_ORDER[0]!;

    await this.prisma.$transaction([
      this.prisma.workflowExecution.update({
        where: { id: workflow.id },
        data: { status: WorkflowStatus.RUNNING, errorMessage: null },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.RUNNING },
      }),
    ]);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { settings: true },
    });

    await this.dispatchWorker(
      workflow.id,
      projectId,
      workflow.correlationId,
      step,
      project?.settings?.providerOverrides as Record<string, string> | undefined,
    );

    return workflow;
  }

  async cancelWorkflow(projectId: string, workspaceId: string) {
    const workflow = await this.getLatestWorkflow(projectId, workspaceId);
    if (!workflow) throw new NotFoundException('Workflow not found');

    await this.prisma.$transaction([
      this.prisma.workflowExecution.update({
        where: { id: workflow.id },
        data: { status: WorkflowStatus.CANCELLED },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.CANCELLED },
      }),
      this.prisma.workerExecution.updateMany({
        where: {
          workflowExecutionId: workflow.id,
          status: { in: [WorkerStatus.PENDING, WorkerStatus.QUEUED, WorkerStatus.RUNNING] },
        },
        data: { status: WorkerStatus.CANCELLED },
      }),
    ]);

    this.realtime.emitWorkflowUpdate(projectId, {
      status: WorkflowStatus.CANCELLED,
    });

    return { success: true };
  }

  private async completeAiPipeline(workflow: {
    id: string;
    projectId: string;
    project: { settings: { autoApprove: boolean } | null };
  }) {
    const autoApprove = workflow.project.settings?.autoApprove ?? false;

    if (autoApprove) {
      await this.prisma.$transaction([
        this.prisma.workflowExecution.update({
          where: { id: workflow.id },
          data: { status: WorkflowStatus.RENDERING, currentStep: 'render' },
        }),
        this.prisma.project.update({
          where: { id: workflow.projectId },
          data: { status: ProjectStatus.RENDERING },
        }),
      ]);
      // Rendering is triggered by RenderingService in approve flow
    } else {
      await this.prisma.$transaction([
        this.prisma.workflowExecution.update({
          where: { id: workflow.id },
          data: { status: WorkflowStatus.AWAITING_APPROVAL },
        }),
        this.prisma.project.update({
          where: { id: workflow.projectId },
          data: { status: ProjectStatus.AWAITING_APPROVAL },
        }),
      ]);
    }

    this.realtime.emitWorkflowUpdate(workflow.projectId, {
      status: autoApprove ? WorkflowStatus.RENDERING : WorkflowStatus.AWAITING_APPROVAL,
    });
  }

  private async dispatchWorker(
    workflowExecutionId: string,
    projectId: string,
    correlationId: string,
    workerKey: WorkerKey,
    providerOverrides?: Record<string, string>,
    attempt = 0,
    existingExecutionId?: string,
  ) {
    const { version } = await this.promptResolver.resolveActivePrompt(workerKey);
    const provider = this.providerResolver.resolve(
      workerKey,
      attempt,
      WORKER_MAX_RETRIES,
      providerOverrides,
    );

    let workerExecutionId = existingExecutionId;

    if (!workerExecutionId) {
      const execution = await this.prisma.workerExecution.create({
        data: {
          workflowExecutionId,
          workerKey,
          status: WorkerStatus.QUEUED,
          provider,
          promptVersionId: version.id,
          maxRetries: WORKER_MAX_RETRIES,
        },
      });
      workerExecutionId = execution.id;
    } else {
      await this.prisma.workerExecution.update({
        where: { id: workerExecutionId },
        data: { status: WorkerStatus.QUEUED, provider },
      });
    }

    const job = await this.jobEnqueue.enqueueAiWorker(workerKey, {
      idempotencyKey: `project:${projectId}:worker:${workerKey}:attempt:${attempt}:${workerExecutionId}`,
      correlationId,
      projectId,
      workflowExecutionId,
      workerExecutionId,
      attempt,
    });

    await this.prisma.workerExecution.update({
      where: { id: workerExecutionId },
      data: { bullJobId: job.id },
    });

    this.realtime.emitWorkerStatus(projectId, {
      workerKey,
      status: WorkerStatus.QUEUED,
      workerExecutionId,
    });
  }

  private async getLatestWorkflow(projectId: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, campaign: { workspaceId } },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.workflowExecution.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
