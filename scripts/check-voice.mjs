import { PrismaClient } from '@prisma/client';

const projectId = process.argv[2] ?? '2ac63289-8562-4a42-b452-704b6bd6c3c2';
const prisma = new PrismaClient();

const voice = await prisma.voiceArtifact.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});
const workflow = await prisma.workflowExecution.findFirst({
  where: { projectId },
  orderBy: { createdAt: 'desc' },
  include: {
      workerExecutions: {
        where: { workerKey: 'voice' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  },
});
const we = workflow?.workerExecutions[0];

console.log(JSON.stringify({
  voiceR2Path: voice?.r2Path,
  voiceVersion: voice?.version,
  workerStatus: we?.status,
  workerId: we?.id,
  outputRefType: we?.outputRef === null ? 'null' : typeof we?.outputRef,
  outputRefKeys: we?.outputRef && typeof we.outputRef === 'object' ? Object.keys(we.outputRef) : [],
  hasAudioBase64: !!(we?.outputRef && typeof we.outputRef === 'object' && we.outputRef.audioBase64),
  audioBase64Length: we?.outputRef?.audioBase64?.length ?? 0,
}, null, 2));

await prisma.$disconnect();
