import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerlessHandler } from '../dist/bootstrap';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await getServerlessHandler();
  return new Promise<void>((resolve, reject) => {
    server(req as Parameters<typeof server>[0], res as Parameters<typeof server>[1], (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
