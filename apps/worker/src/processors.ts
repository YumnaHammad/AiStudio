import { Job, Worker, ConnectionOptions, Queue } from 'bullmq';
import { PrismaClient, WorkerStatus, WorkflowStatus, ProjectStatus } from '@acs/database';
import {
  AiWorkerJobPayload,
  WorkerCompleteJobPayload,
  WorkerKey,
  QueueName,
  resolveWorkerProvider,
  resolvePipelineOrder,
  BULLMQ_WORKER_OPTIONS,
} from '@acs/shared';
import { getWorker } from '@acs/ai-workers';
import { loadWorkerContext } from './context-loader';
import {
  ArtifactPersister,
  logWorkerExecution,
  markWorkerComplete,
  markWorkerFailed,
} from './artifact-persister';
import { finishPipeline } from './render-enqueuer';

const WORKER_QUEUE_MAP: Record<WorkerKey, QueueName> = {
  [WorkerKey.RESEARCH]: QueueName.AI_RESEARCH,
  [WorkerKey.FACT_CHECKER]: QueueName.AI_FACT_CHECKER,
  [WorkerKey.SCRIPT]: QueueName.AI_SCRIPT,
  [WorkerKey.TRANSLATION]: QueueName.AI_TRANSLATION,
  [WorkerKey.VOICE]: QueueName.AI_VOICE,
  [WorkerKey.SCENE_PLANNER]: QueueName.AI_SCENE_PLANNER,
  [WorkerKey.ASSET_FINDER]: QueueName.AI_ASSET_FINDER,
  [WorkerKey.THUMBNAIL]: QueueName.AI_THUMBNAIL,
  [WorkerKey.SEO]: QueueName.AI_SEO,
  [WorkerKey.PODCAST]: QueueName.AI_PODCAST,
  [WorkerKey.SOCIAL_MEDIA]: QueueName.AI_SOCIAL,
  [WorkerKey.QUALITY_CHECK]: QueueName.AI_QUALITY_CHECK,
};

export function createAiWorkerProcessors(
  connection: ConnectionOptions,
  prisma: PrismaClient,
): Worker[] {
  const persister = new ArtifactPersister(prisma);
  const completeQueue = new Queue(QueueName.ORCHESTRATOR_COMPLETE, { connection });

  const processors: Worker[] = [];

  for (const workerKey of Object.values(WorkerKey)) {
    const queueName = WORKER_QUEUE_MAP[workerKey];

    const worker = new Worker(
      queueName,
      async (job: Job<AiWorkerJobPayload>) => {
        const payload = job.data;
        console.log(`[${workerKey}] Processing job ${job.id}`);

        await prisma.workerExecution.update({
          where: { id: payload.workerExecutionId },
          data: { status: WorkerStatus.RUNNING, startedAt: new Date() },
        });

        try {
          const ctx = await loadWorkerContext(prisma, payload, {
            openai: process.env.OPENAI_API_KEY,
            anthropic: process.env.ANTHROPIC_API_KEY,
            elevenlabs: process.env.ELEVENLABS_API_KEY,
            pexels: process.env.PEXELS_API_KEY,
            pixabay: process.env.PIXABAY_API_KEY,
          });

          const workerImpl = getWorker(workerKey);
          const result = await workerImpl.execute(ctx);

          if (!result.success) {
            throw new Error(result.error ?? 'Worker returned failure');
          }

          await persister.persist(workerKey, payload.projectId, payload.workerExecutionId, result);
          await logWorkerExecution(prisma, payload.workerExecutionId, result.logs);
          await markWorkerComplete(prisma, payload.workerExecutionId, result);

          const workflow = await prisma.workflowExecution.findUnique({
            where: { id: payload.workflowExecutionId },
            include: { project: { include: { campaign: true } } },
          });

          if (workflow) {
            await prisma.costLedgerEntry.create({
              data: {
                workspaceId: workflow.project.campaign.workspaceId,
                projectId: payload.projectId,
                workerExecutionId: payload.workerExecutionId,
                provider: result.provider,
                model: result.model,
                operation: workerKey,
                units: result.usage.units ?? result.usage.inputTokens ?? 0,
                unitType: result.usage.unitType,
                amountUsd: result.usage.costUsd,
              },
            });
          }

          const completePayload: WorkerCompleteJobPayload = {
            jobId: payload.jobId,
            idempotencyKey: `complete:${payload.workerExecutionId}`,
            correlationId: payload.correlationId,
            projectId: payload.projectId,
            workflowExecutionId: payload.workflowExecutionId,
            workerKey,
            workerExecutionId: payload.workerExecutionId,
            success: true,
            enqueuedAt: new Date().toISOString(),
          };

          await completeQueue.add('complete', completePayload);
          await job.updateProgress(100);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[${workerKey}] Failed:`, message);
          await markWorkerFailed(prisma, payload.workerExecutionId, message);

          await completeQueue.add('complete', {
            jobId: payload.jobId,
            idempotencyKey: `complete-fail:${payload.workerExecutionId}`,
            correlationId: payload.correlationId,
            projectId: payload.projectId,
            workflowExecutionId: payload.workflowExecutionId,
            workerKey,
            workerExecutionId: payload.workerExecutionId,
            success: false,
            error: message,
            enqueuedAt: new Date().toISOString(),
          } satisfies WorkerCompleteJobPayload);
          throw error;
        }
      },
      { connection, concurrency: 2, ...BULLMQ_WORKER_OPTIONS },
    );

    worker.on('failed', (job, err) => {
      console.error(`[${workerKey}] Job ${job?.id} failed:`, err.message);
    });

    processors.push(worker);
  }

  return processors;
}

export function createOrchestratorCompleteProcessor(
  connection: ConnectionOptions,
  prisma: PrismaClient,
): Worker {
  return new Worker(
    QueueName.ORCHESTRATOR_COMPLETE,
    async (job: Job<WorkerCompleteJobPayload>) => {
      const payload = job.data;

      if (!payload.success) {
        await prisma.workflowExecution.update({
          where: { id: payload.workflowExecutionId },
          data: {
            status: WorkflowStatus.FAILED,
            errorMessage: payload.error,
          },
        });
        await prisma.project.update({
          where: { id: payload.projectId },
          data: { status: ProjectStatus.FAILED },
        });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: payload.projectId },
        include: { settings: true },
      });
      const metadata = (project?.settings?.metadata ?? {}) as { customScript?: string };
      const pipelineOrder = resolvePipelineOrder({
        customScript: !!metadata.customScript?.trim(),
      });

      const currentIndex = pipelineOrder.indexOf(payload.workerKey);
      const nextStep = pipelineOrder[currentIndex + 1];

      if (!nextStep) {
        try {
          await finishPipeline(
            prisma,
            connection,
            payload.projectId,
            payload.workflowExecutionId,
            payload.correlationId,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await prisma.workflowExecution.update({
            where: { id: payload.workflowExecutionId },
            data: { status: WorkflowStatus.FAILED, errorMessage: message },
          });
          await prisma.project.update({
            where: { id: payload.projectId },
            data: { status: ProjectStatus.FAILED },
          });
        }
        return;
      }

      await prisma.workflowExecution.update({
        where: { id: payload.workflowExecutionId },
        data: { currentStep: nextStep, status: WorkflowStatus.AWAITING_WORKER },
      });

      const dispatchQueue = new Queue(WORKER_QUEUE_MAP[nextStep], { connection });
      const prompt = await prisma.prompt.findFirst({
        where: { workerKey: nextStep },
        include: { versions: { where: { isActive: true }, take: 1 } },
      });

      const workerExecution = await prisma.workerExecution.create({
        data: {
          workflowExecutionId: payload.workflowExecutionId,
          workerKey: nextStep,
          status: WorkerStatus.QUEUED,
          provider: resolveWorkerProvider(nextStep),
          promptVersionId: prompt?.versions[0]?.id,
        },
      });

      await dispatchQueue.add(nextStep, {
        jobId: workerExecution.id,
        idempotencyKey: `project:${payload.projectId}:worker:${nextStep}:${workerExecution.id}`,
        correlationId: payload.correlationId,
        projectId: payload.projectId,
        workflowExecutionId: payload.workflowExecutionId,
        workerKey: nextStep,
        workerExecutionId: workerExecution.id,
        attempt: 0,
        enqueuedAt: new Date().toISOString(),
      } satisfies AiWorkerJobPayload);

      await dispatchQueue.close();
    },
    { connection, concurrency: 5, ...BULLMQ_WORKER_OPTIONS },
  );
}
