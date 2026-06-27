import http from 'http';
import fs from 'fs';
import path from 'path';
import { getLocalMediaRoot } from '@acs/shared';

let serverBaseUrl: string | null = null;

export async function startLocalMediaServer(): Promise<string> {
  if (serverBaseUrl) return serverBaseUrl;

  const port = parseInt(process.env.LOCAL_MEDIA_PORT ?? '3001', 10);
  const root = path.resolve(getLocalMediaRoot());

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end();
      return;
    }

    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = urlPath.replace(/^\/+/, '');
    const filePath = path.resolve(root, relative);

    if (!filePath.startsWith(root + path.sep) && filePath !== root) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
    };

    res.writeHead(200, {
      'Content-Type': contentTypes[ext] ?? 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  serverBaseUrl = `http://127.0.0.1:${port}`;
  console.log(`Local media server listening at ${serverBaseUrl} (root: ${root})`);
  return serverBaseUrl;
}

export function localMediaHttpUrl(relativePath: string): string {
  if (!serverBaseUrl) {
    throw new Error('Local media server has not been started');
  }
  return `${serverBaseUrl}/${relativePath.replace(/\\/g, '/')}`;
}
