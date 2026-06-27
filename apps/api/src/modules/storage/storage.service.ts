import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_PATH_PREFIX } from '@acs/shared';

export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucketName: string;
  private readonly publicUrl: string | undefined;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('r2.accountId');
    const accessKeyId = this.configService.get<string>('r2.accessKeyId');
    const secretAccessKey = this.configService.get<string>('r2.secretAccessKey');
    this.bucketName = this.configService.get<string>('r2.bucketName') ?? 'ai-content-studio';
    this.publicUrl = this.configService.get<string>('r2.publicUrl');

    this.configured = !!(accountId && accessKeyId && secretAccessKey);

    this.client = this.configured
      ? new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
        })
      : null;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  buildPath(prefix: keyof typeof R2_PATH_PREFIX, projectId: string, filename: string): string {
    return `${R2_PATH_PREFIX[prefix]}/${projectId}/${filename}`;
  }

  async upload(options: UploadOptions): Promise<string> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        Metadata: options.metadata,
      }),
    );

    return options.key;
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getSignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string | null {
    if (!this.publicUrl) return null;
    return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
  }
}
