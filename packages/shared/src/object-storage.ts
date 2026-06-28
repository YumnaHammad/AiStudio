import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let cachedClient: S3Client | null | undefined;

export function isObjectStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME ?? 'ai-content-studio';
}

function getClient(): S3Client | null {
  if (cachedClient !== undefined) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    cachedClient = null;
    return null;
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    await client.send(
      new HeadObjectCommand({ Bucket: getBucketName(), Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function getObjectSignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error('Object storage is not configured');
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getBucketName(), Key: key }),
    { expiresIn },
  );
}

export function getObjectPublicUrl(key: string): string | null {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  if (!base) return null;
  return `${base}/${key}`;
}
