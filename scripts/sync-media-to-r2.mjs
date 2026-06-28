/** Upload existing local media files to R2 (for videos rendered before cloud upload was enabled). */
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import {
  getLocalMediaRoot,
  isObjectStorageConfigured,
  uploadObject,
} from '@acs/shared';

config({ path: path.resolve(process.cwd(), '.env') });

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

async function walk(dir: string, root: string, uploaded: string[]): Promise<void> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, root, uploaded);
      continue;
    }
    const relative = path.relative(root, full).replace(/\\/g, '/');
    const ext = path.extname(full).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    const body = fs.readFileSync(full);
    await uploadObject(relative, body, contentType);
    uploaded.push(relative);
    console.log(`uploaded ${relative} (${body.length} bytes)`);
  }
}

async function main() {
  if (!isObjectStorageConfigured()) {
    console.error('R2 is not configured in .env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
    process.exit(1);
  }

  const root = getLocalMediaRoot();
  if (!fs.existsSync(root)) {
    console.log('No local media folder:', root);
    return;
  }

  const uploaded: string[] = [];
  await walk(root, root, uploaded);
  console.log(`Done. Uploaded ${uploaded.length} file(s) to R2.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
