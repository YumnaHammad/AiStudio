import { config } from 'dotenv';
import path from 'path';

// Monorepo root .env (same as API), then optional local override
config({ path: path.resolve(__dirname, '../../../.env') });
config();
import { PrismaClient } from '@acs/database';
import { ConnectionOptions } from 'bullmq';
import { createAiWorkerProcessors, createOrchestratorCompleteProcessor } from './processors';

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

async function main() {
  console.log('Starting AI Content Studio Worker...');

  const prisma = new PrismaClient();
  await prisma.$connect();

  const connection = parseRedisConnection();
  const aiWorkers = createAiWorkerProcessors(connection, prisma);
  const orchestrator = createOrchestratorCompleteProcessor(connection, prisma);

  console.log(`Registered ${aiWorkers.length} AI worker processors + orchestrator`);

  const shutdown = async () => {
    console.log('Shutting down workers...');
    await Promise.all([...aiWorkers, orchestrator].map((w) => w.close()));
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
