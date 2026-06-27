import { PrismaClient } from '@prisma/client';

const projectId = process.argv[2];
const prisma = new PrismaClient();
const video = await prisma.video.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});
console.log(JSON.stringify(video, null, 2));
await prisma.$disconnect();
