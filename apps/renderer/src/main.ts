import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(__dirname, '../../../.env') });
loadEnv();
import { PrismaClient, ProjectStatus, VideoStatus, WorkflowStatus } from '@acs/database';
import { Worker, Job, ConnectionOptions } from 'bullmq';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import {
  QueueName,
  R2_PATH_PREFIX,
  resolveLocalMediaPath,
  localMediaExists,
  saveLocalMedia,
} from '@acs/shared';
import { buildTimeline } from '@acs/rendering';
import type { RenderVariationSelections } from '@acs/shared';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { localMediaHttpUrl, startLocalMediaServer } from './local-media-server';

function parseRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

async function renderVideo(
  prisma: PrismaClient,
  payload: {
    projectId: string;
    videoId: string;
    renderConfigId: string;
  },
  onProgress: (p: number) => Promise<void>,
) {
  const video = await prisma.video.findUniqueOrThrow({
    where: { id: payload.videoId },
    include: {
      renderConfig: true,
      project: {
        include: {
          scriptArtifacts: { orderBy: { version: 'desc' }, take: 1 },
          voiceArtifacts: { orderBy: { version: 'desc' }, take: 1 },
          scenePlans: {
            orderBy: { version: 'desc' },
            take: 1,
            include: { scenes: { orderBy: { orderIndex: 'asc' }, include: { asset: true } } },
          },
        },
      },
    },
  });

  const script = video.project.scriptArtifacts[0];
  const voice = video.project.voiceArtifacts[0];
  const scenePlan = video.project.scenePlans[0];
  const selections = video.renderConfig!.selections as unknown as RenderVariationSelections;

  let voiceAudioUrl = '';
  if (voice?.r2Path) {
    if (!localMediaExists(voice.r2Path)) {
      throw new Error(
        `Voice file missing at ${resolveLocalMediaPath(voice.r2Path)}. Create a new project after restarting the backend.`,
      );
    }
    voiceAudioUrl = localMediaHttpUrl(voice.r2Path);
  }

  const timeline = buildTimeline({
    projectId: payload.projectId,
    videoId: payload.videoId,
    title: video.project.topic,
    voiceAudioUrl,
    voiceDurationMs: voice?.durationMs ?? 60000,
    selections,
    scenes: (scenePlan?.scenes ?? []).map((s) => ({
      orderIndex: s.orderIndex,
      narration: s.narration,
      durationMs: s.durationMs,
      subtitle: s.subtitle as { cues?: { startMs: number; endMs: number; text: string }[] },
      animation: s.animation,
      transition: s.transition,
      layout: s.layout,
      cameraEffect: s.cameraEffect,
      background: s.background as Record<string, unknown>,
      asset: s.asset
        ? { externalUrl: s.asset.externalUrl, r2Path: s.asset.r2Path, type: s.asset.type }
        : undefined,
    })),
  });

  await prisma.renderConfig.update({
    where: { id: payload.renderConfigId },
    data: { timelineJson: timeline as object },
  });

  const entryPoint = path.join(__dirname, 'remotion', 'index.ts');
  const bundleLocation = await bundle({ entryPoint, webpackOverride: (c) => c });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'VideoComposition',
    inputProps: { timeline },
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-render-'));
  const rawOutput = path.join(tmpDir, 'raw.mp4');
  const optimizedOutput = path.join(tmpDir, 'optimized.mp4');

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: rawOutput,
    inputProps: { timeline },
    onProgress: async ({ progress }) => {
      await onProgress(Math.floor(progress * 80));
    },
  });

  await onProgress(85);

  try {
    execSync(
      `ffmpeg -y -i "${rawOutput}" -c:v libx264 -crf 23 -preset medium -movflags +faststart -c:a aac -b:a 192k "${optimizedOutput}"`,
      { stdio: 'pipe' },
    );
  } catch {
    fs.copyFileSync(rawOutput, optimizedOutput);
  }

  await onProgress(95);

  const r2PathRaw = `${R2_PATH_PREFIX.VIDEO_RAW}/${payload.projectId}/${payload.videoId}.mp4`;
  const r2PathOptimized = `${R2_PATH_PREFIX.VIDEO_OPTIMIZED}/${payload.projectId}/${payload.videoId}.mp4`;

  const optimizedBuffer = fs.readFileSync(optimizedOutput);
  saveLocalMedia(r2PathOptimized, optimizedBuffer);

  await prisma.video.update({
    where: { id: payload.videoId },
    data: {
      status: VideoStatus.COMPLETED,
      r2PathRaw,
      r2PathOptimized,
      durationMs: timeline.totalDurationMs,
      width: timeline.width,
      height: timeline.height,
      sizeBytes: BigInt(optimizedBuffer.length),
    },
  });

  await prisma.workflowExecution.updateMany({
    where: { projectId: payload.projectId },
    data: {
      status: WorkflowStatus.COMPLETED,
      currentStep: 'complete',
      completedAt: new Date(),
      errorMessage: null,
    },
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  await onProgress(100);
}

async function main() {
  console.log('Starting Remotion Renderer...');
  await startLocalMediaServer();

  const prisma = new PrismaClient();
  await prisma.$connect();

  const connection = parseRedisConnection();

  const worker = new Worker(
    QueueName.RENDER_VIDEO,
    async (job: Job) => {
      const payload = job.data as {
        projectId: string;
        videoId: string;
        renderConfigId: string;
      };

      await prisma.video.update({
        where: { id: payload.videoId },
        data: { status: VideoStatus.RENDERING },
      });

      try {
        await renderVideo(prisma, payload, async (progress) => {
          await job.updateProgress(progress);
        });
        await prisma.project.update({
          where: { id: payload.projectId },
          data: { status: ProjectStatus.COMPLETED },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.$transaction([
          prisma.video.update({
            where: { id: payload.videoId },
            data: { status: VideoStatus.FAILED },
          }),
          prisma.project.update({
            where: { id: payload.projectId },
            data: { status: ProjectStatus.FAILED },
          }),
          prisma.workflowExecution.updateMany({
            where: { projectId: payload.projectId, status: WorkflowStatus.RENDERING },
            data: { status: WorkflowStatus.FAILED, errorMessage: message },
          }),
        ]);
        throw error;
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    console.error(`Render job ${job?.id} failed:`, err.message);
  });

  console.log('Render worker listening on render-video queue');

  const shutdown = async () => {
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
