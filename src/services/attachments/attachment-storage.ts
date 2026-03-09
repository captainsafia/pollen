import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import { getEnv } from "@/config/env";
import { AppError } from "@/lib/errors";
import { type ValidatedAttachment } from "@/services/attachments/attachment-validation";

export type StoredAttachment = {
  filename: string;
  mimeType: string;
  size: number;
  artifactUrl: string;
  excerpt?: string;
};

interface AttachmentStorage {
  upload(attachment: ValidatedAttachment, requestId: string): Promise<StoredAttachment>;
}

class MockAttachmentStorage implements AttachmentStorage {
  async upload(attachment: ValidatedAttachment, requestId: string): Promise<StoredAttachment> {
    const key = `${requestId}/${randomUUID()}-${attachment.filename}`;
    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      artifactUrl: `https://mock-storage.local/${key}`,
      excerpt: attachment.textExcerpt
    };
  }
}

class S3AttachmentStorage implements AttachmentStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;
  private readonly publicBaseUrl?: string;

  constructor() {
    const env = getEnv();
    if (
      !env.OBJECT_STORAGE_REGION ||
      !env.OBJECT_STORAGE_BUCKET ||
      !env.OBJECT_STORAGE_ACCESS_KEY_ID ||
      !env.OBJECT_STORAGE_SECRET_ACCESS_KEY
    ) {
      throw new AppError(
        "internal_error",
        "Object storage environment is incomplete",
        500,
        "Set OBJECT_STORAGE_* variables"
      );
    }

    this.bucket = env.OBJECT_STORAGE_BUCKET;
    this.keyPrefix = env.OBJECT_STORAGE_KEY_PREFIX;
    this.publicBaseUrl = env.OBJECT_STORAGE_PUBLIC_BASE_URL;
    this.client = new S3Client({
      region: env.OBJECT_STORAGE_REGION,
      endpoint: env.OBJECT_STORAGE_ENDPOINT,
      forcePathStyle: Boolean(env.OBJECT_STORAGE_ENDPOINT),
      credentials: {
        accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY
      }
    });
  }

  private getPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async upload(attachment: ValidatedAttachment, requestId: string): Promise<StoredAttachment> {
    const key = `${this.keyPrefix}/${requestId}/${randomUUID()}-${attachment.filename}`;
    const body = Readable.fromWeb(attachment.file.stream() as NodeReadableStream);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: attachment.mimeType,
      Body: body
    });

    await new Upload({
      client: this.client,
      params: command.input
    }).done();

    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      artifactUrl: this.getPublicUrl(key),
      excerpt: attachment.textExcerpt
    };
  }
}

let cachedStorage: AttachmentStorage | null = null;

export const getAttachmentStorage = (): AttachmentStorage => {
  if (cachedStorage) {
    return cachedStorage;
  }
  const env = getEnv();
  cachedStorage = env.ATTACHMENT_STORAGE_BACKEND === "mock" ? new MockAttachmentStorage() : new S3AttachmentStorage();
  return cachedStorage;
};
