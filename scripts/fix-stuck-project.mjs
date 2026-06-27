import { PrismaClient, ProjectStatus, VideoStatus, WorkflowStatus } from '@prisma/client';

const projectId = process.argv[2];
const message =
  process.argv[3] ??
  'Voice audio file missing. Restart backend and create a new project.';

const prisma = new PrismaClient();
await prisma.$transaction([
  prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.FAILED },
  }),
  prisma.workflowExecution.updateMany({
    where: { projectId },
    data: { status: WorkflowStatus.FAILED, errorMessage: message },
  }),
  prisma.video.updateMany({
    where: { projectId, status: VideoStatus.RENDERING },
    data: { status: VideoStatus.FAILED },
  }),
]);
console.log(`Marked ${projectId} as FAILED`);
await prisma.$disconnect();
