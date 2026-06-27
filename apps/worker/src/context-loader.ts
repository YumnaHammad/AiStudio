import { PrismaClient } from '@acs/database';
import { WorkerKey, WORKER_PIPELINE_ORDER } from '@acs/shared';
import { ProviderFactory, ProviderCredentials } from '@acs/providers';
import { WorkerContext } from '@acs/ai-workers';
import { createDecipheriv, scryptSync } from 'crypto';

export async function loadWorkerContext(
  prisma: PrismaClient,
  payload: {
    projectId: string;
    workflowExecutionId: string;
    workerExecutionId: string;
    workerKey: WorkerKey;
  },
  envCredentials: ProviderCredentials,
): Promise<WorkerContext> {
  const execution = await prisma.workerExecution.findUniqueOrThrow({
    where: { id: payload.workerExecutionId },
    include: {
      promptVersion: true,
      workflowExecution: {
        include: {
          project: { include: { settings: true, campaign: true } },
        },
      },
    },
  });

  const project = execution.workflowExecution.project;
  const workspaceId = project.campaign.workspaceId;
  const settingsMetadata = (project.settings?.metadata ?? {}) as {
    customScript?: string;
  };

  const workspaceKeys = await prisma.apiKey.findMany({
    where: { workspaceId, isActive: true },
  });

  const credentials: ProviderCredentials = { ...envCredentials };
  const encryptionKey = process.env.ENCRYPTION_KEY;

  for (const key of workspaceKeys) {
    if (!encryptionKey) continue;
    try {
      const decrypted = decryptApiKey(key.encryptedKey, encryptionKey);
      const provider = key.provider as keyof ProviderCredentials;
      if (provider in credentials || ['openai', 'anthropic', 'elevenlabs', 'pexels', 'pixabay'].includes(key.provider)) {
        (credentials as Record<string, string>)[key.provider === 'openai-tts' ? 'openai' : key.provider] = decrypted;
      }
    } catch {
      // skip invalid keys
    }
  }

  const artifacts = await loadArtifacts(prisma, payload.projectId, payload.workerKey);

  const providerKey = execution.provider ?? 'openai';

  return {
    projectId: payload.projectId,
    workflowExecutionId: payload.workflowExecutionId,
    workerExecutionId: payload.workerExecutionId,
    workerKey: payload.workerKey,
    providerKey,
    project: {
      topic: project.topic,
      language: project.language,
      videoStyle: project.videoStyle,
      platform: project.platform,
      durationTarget: project.durationTarget,
      customScript: settingsMetadata.customScript ?? null,
    },
    prompt: {
      content: execution.promptVersion?.content ?? '',
      versionId: execution.promptVersion?.id ?? '',
      version: execution.promptVersion?.version ?? 1,
    },
    artifacts,
    providers: new ProviderFactory(credentials),
  };
}

async function loadArtifacts(
  prisma: PrismaClient,
  projectId: string,
  currentWorker: WorkerKey,
): Promise<Record<string, unknown>> {
  const artifacts: Record<string, unknown> = {};
  const currentIndex = WORKER_PIPELINE_ORDER.indexOf(currentWorker);

  if (currentIndex > 0) {
    const research = await prisma.researchArtifact.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    if (research) artifacts.research = research.content;
  }

  if (currentIndex > WORKER_PIPELINE_ORDER.indexOf(WorkerKey.FACT_CHECKER)) {
    const verified = await prisma.researchArtifact.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    if (verified) artifacts.verifiedResearch = verified.content;
  }

  const script = await prisma.scriptArtifact.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  if (script) {
    artifacts.script = {
      content: script.content,
      title: (script.sections as Array<{ heading?: string }>)?.[0]?.heading,
      sections: script.sections,
      wordCount: script.wordCount,
    };
  }

  const translation = await prisma.translationArtifact.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  if (translation) artifacts.translation = { content: translation.content, language: translation.language };

  const voice = await prisma.voiceArtifact.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  if (voice) artifacts.voice = { r2Path: voice.r2Path, wordTimings: voice.wordTimings, durationMs: voice.durationMs };

  const scenePlan = await prisma.scenePlan.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
    include: { scenes: { orderBy: { orderIndex: 'asc' } } },
  });
  if (scenePlan) artifacts.scenes = { scenes: scenePlan.scenes, totalDurationMs: scenePlan.totalDurationMs };

  const seo = await prisma.seoMetadata.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  if (seo) artifacts.seo = seo;

  return artifacts;
}

function decryptApiKey(ciphertext: string, encryptionKey: string): string {
  const key = scryptSync(encryptionKey, 'acs-salt', 32);
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');
  const encrypted = Buffer.from(encryptedHex!, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
