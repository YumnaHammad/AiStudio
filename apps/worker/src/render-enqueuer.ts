import { createHash, randomBytes } from 'crypto';
import { Queue } from 'bullmq';
import { ConnectionOptions } from 'bullmq';
import {
  PrismaClient,
  Prisma,
  ProjectStatus,
  VideoStatus,
  WorkflowStatus,
} from '@acs/database';
import { QueueName, localMediaExists, RenderVariationSelections } from '@acs/shared';
import { v4 as uuidv4 } from 'uuid';

function defaultSelections(templateKey: string): RenderVariationSelections {
  const cinematic = templateKey.includes('history') || templateKey.includes('documentary');
  return {
    templateKey,
    layout: cinematic ? 'full-bleed' : 'centered',
    animation: cinematic ? 'ken-burns' : 'fade',
    transition: cinematic ? 'dissolve-300' : 'crossfade',
    subtitleStyle: cinematic ? 'lower-third' : 'lower-third',
    fontHeading: cinematic ? 'Playfair Display' : 'Inter',
    fontBody: cinematic ? 'Inter' : 'Inter',
    intro: cinematic ? 'title-fade' : 'title-card',
    outro: cinematic ? 'fade-to-black' : 'fade-out',
    background: cinematic ? 'dark-gradient' : 'gradient',
    imagePosition: 'full-bleed',
    cameraEffect: cinematic ? 'slow-zoom-in' : 'ken-burns',
    musicTrack: cinematic ? 'ambient-cinematic' : 'none',
    colorPalette: cinematic ? 'navy-gold' : 'default',
  };
}

async function cinematicTemplateFilter(
  prisma: PrismaClient,
  videoStyle?: string | null,
): Promise<{ key?: string; category?: string }> {
  if (['DOCUMENTARY', 'STORYTELLING', 'MOTIVATIONAL'].includes(videoStyle ?? '')) {
    const docTemplate = await prisma.template.findFirst({
      where: { isActive: true, key: 'history-documentary' },
    });
    if (docTemplate) return { key: 'history-documentary' };
    return { category: 'HISTORY' };
  }
  return {};
}

export async function enqueueProjectRender(
  prisma: PrismaClient,
  connection: ConnectionOptions,
  projectId: string,
  workflowExecutionId: string,
  correlationId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      voiceArtifacts: { orderBy: { version: 'desc' }, take: 1 },
    },
  });
  if (!project) return;

  const voice = project.voiceArtifacts[0];
  if (!voice?.r2Path || !localMediaExists(voice.r2Path)) {
    throw new Error(
      'Voice audio file is missing. Regenerate voice before rendering.',
    );
  }

  const template = await prisma.template.findFirst({
    where: {
      isActive: true,
      ...(await cinematicTemplateFilter(prisma, project.videoStyle)),
    },
    include: {
      versions: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
    },
  });
  if (!template?.versions[0]) {
    throw new Error('No active render template found');
  }

  const version = template.versions[0];
  const variationSeed = randomBytes(32).toString('hex');
  const selections = defaultSelections(template.key);
  const selectionsHash = createHash('sha256')
    .update(JSON.stringify(selections))
    .digest('hex')
    .slice(0, 16);

  const latestVideo = await prisma.video.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (latestVideo?.version ?? 0) + 1;

  const video = await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.RENDERING },
    });

    await tx.workflowExecution.update({
      where: { id: workflowExecutionId },
      data: { status: WorkflowStatus.RENDERING, currentStep: 'render' },
    });

    const createdVideo = await tx.video.create({
      data: {
        projectId,
        version: nextVersion,
        status: VideoStatus.QUEUED,
        templateVersionId: version.id,
      },
    });

    const renderConfig = await tx.renderConfig.create({
      data: {
        videoId: createdVideo.id,
        templateVersionId: version.id,
        variationSeed,
        selectionsHash,
        selections: selections as unknown as Prisma.InputJsonValue,
      },
    });

    return { video: createdVideo, renderConfig };
  });

  const renderQueue = new Queue(QueueName.RENDER_VIDEO, { connection });
  const job = await renderQueue.add(
    'render',
    {
      jobId: uuidv4(),
      idempotencyKey: `render:${video.video.id}`,
      correlationId,
      projectId,
      workflowExecutionId,
      videoId: video.video.id,
      renderConfigId: video.renderConfig.id,
      enqueuedAt: new Date().toISOString(),
    },
    { jobId: `render-${video.video.id}` },
  );
  await renderQueue.close();

  await prisma.video.update({
    where: { id: video.video.id },
    data: { renderJobId: job.id, status: VideoStatus.RENDERING },
  });
}

export async function finishPipeline(
  prisma: PrismaClient,
  connection: ConnectionOptions,
  projectId: string,
  workflowExecutionId: string,
  correlationId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { settings: true },
  });

  const autoApprove =
    project?.settings?.autoApprove ??
    process.env.COST_SAVER_AUTO_APPROVE === 'true';

  if (autoApprove) {
    await enqueueProjectRender(
      prisma,
      connection,
      projectId,
      workflowExecutionId,
      correlationId,
    );
    return;
  }

  await prisma.workflowExecution.update({
    where: { id: workflowExecutionId },
    data: { status: WorkflowStatus.AWAITING_APPROVAL },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.AWAITING_APPROVAL },
  });
}
