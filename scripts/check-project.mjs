import { PrismaClient } from '@prisma/client';

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/check-project.mjs <projectId>');
  process.exit(1);
}

const prisma = new PrismaClient();
const workflow = await prisma.workflowExecution.findFirst({
  where: { projectId },
  orderBy: { createdAt: 'desc' },
  include: { workerExecutions: { orderBy: { createdAt: 'asc' } } },
});

console.log(
  JSON.stringify(
    {
      status: workflow?.status,
      step: workflow?.currentStep,
      error: workflow?.errorMessage,
      workers: workflow?.workerExecutions.map((x) => ({
        key: x.workerKey,
        status: x.status,
        provider: x.provider,
        error: x.errorMessage,
      })),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
