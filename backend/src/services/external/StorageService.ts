import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ExternalService } from './baseService';
import { ServiceError } from './errors';
import { ServiceCallResult } from './types';
import crypto from 'crypto';

export interface UploadInput {
  buffer: Buffer;
  contentType: string;
  folder: string; // e.g. 'avatars'
}

export class StorageService extends ExternalService {
  protected readonly serviceName = 'storage';
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    super();
    this.bucket = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async upload(input: UploadInput): Promise<ServiceCallResult<{ url: string; key: string }>> {
    return this.execute(
      async () => {
        const ext = input.contentType.split('/')[1] || 'bin';
        const key = `${input.folder}/${crypto.randomUUID()}.${ext}`;

        try {
          await this.client.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: key,
              Body: input.buffer,
              ContentType: input.contentType,
            })
          );
        } catch (err: any) {
          const permanentCodes = ['AccessDenied', 'InvalidAccessKeyId', 'SignatureDoesNotMatch'];
          if (permanentCodes.includes(err.name)) {
            throw ServiceError.permanent(err.message, err.name);
          }
          throw ServiceError.retryable(err.message, err.name);
        }

        return { url: `${this.publicUrl}/${key}`, key };
      },
      { maxAttempts: 3, baseDelayMs: 600 }
    );
  }

  async delete(key: string): Promise<ServiceCallResult<void>> {
    return this.execute(
      async () => {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      },
      { maxAttempts: 2 }
    );
  }
}

export const storageService = new StorageService();