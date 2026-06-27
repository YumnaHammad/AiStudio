/**
 * Re-synthesize voice MP3 for a project and save to local media.
 * Usage: npx dotenv -e .env -- node scripts/regenerate-voice.mjs <projectId>
 */
import { PrismaClient } from '@prisma/client';
import { saveLocalMedia, localMediaExists, resolveLocalMediaPath } from '@acs/shared';

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node scripts/regenerate-voice.mjs <projectId>');
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY is not set');
  process.exit(1);
}

const prisma = new PrismaClient();

const voice = await prisma.voiceArtifact.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});
if (!voice?.r2Path) {
  console.error('No voice artifact found for project', projectId);
  process.exit(1);
}

if (localMediaExists(voice.r2Path)) {
  console.log('Voice file already exists:', resolveLocalMediaPath(voice.r2Path));
  await prisma.$disconnect();
  process.exit(0);
}

const translation = await prisma.translationArtifact.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});
const script = await prisma.scriptArtifact.findFirst({
  where: { projectId },
  orderBy: { version: 'desc' },
});

const text = translation?.content ?? script?.content;
if (!text) {
  console.error('No script/translation text found to synthesize');
  process.exit(1);
}

const maxChars = parseInt(process.env.COST_SAVER_MAX_VOICE_CHARS ?? '2500', 10);
const input = text.slice(0, maxChars);

console.log(`Synthesizing ${input.length} chars for ${voice.r2Path}...`);

const response = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'tts-1',
    input,
    voice: 'alloy',
    response_format: 'mp3',
  }),
});

if (!response.ok) {
  console.error('OpenAI TTS failed:', response.status, await response.text());
  process.exit(1);
}

const audio = Buffer.from(await response.arrayBuffer());
const savedPath = saveLocalMedia(voice.r2Path, audio);
console.log('Saved voice file:', savedPath);

await prisma.$disconnect();
