import { PrismaClient } from '@prisma/client';

const projectId = process.argv[2] ?? 'd6c90630-17ed-43cb-bd1c-f1f0beb21de7';
const prisma = new PrismaClient();

const project = await prisma.project.findUnique({
  where: { id: projectId },
  select: { topic: true, durationTarget: true },
});

const script = await prisma.scriptArtifact.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});

const translation = await prisma.translationArtifact.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});

const voice = await prisma.voiceArtifact.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});

const scenePlan = await prisma.scenePlan.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
  include: { scenes: { orderBy: { orderIndex: 'asc' } } },
});

console.log(JSON.stringify({
  topic: project?.topic,
  durationTarget: project?.durationTarget,
  scriptPreview: script?.content?.slice(0, 500),
  scriptWordCount: script?.wordCount,
  translationPreview: translation?.content?.slice(0, 500),
  voiceDurationMs: voice?.durationMs,
  sceneCount: scenePlan?.scenes.length,
  sceneNarrations: scenePlan?.scenes.map((s) => s.narration.slice(0, 120)),
}, null, 2));

await prisma.$disconnect();
