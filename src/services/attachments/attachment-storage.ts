import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

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

class VercelBlobAttachmentStorage implements AttachmentStorage {
  private readonly keyPrefix: string;
  private readonly token: string | undefined;

  constructor() {
    const env = getEnv();
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new AppError(
        "internal_error",
        "Vercel Blob environment is incomplete",
        500,
        "Set BLOB_READ_WRITE_TOKEN"
      );
    }
    this.token = env.BLOB_READ_WRITE_TOKEN;
    this.keyPrefix = env.BLOB_KEY_PREFIX;
  }

  async upload(attachment: ValidatedAttachment, requestId: string): Promise<StoredAttachment> {
    const key = `${this.keyPrefix}/${requestId}/${randomUUID()}-${attachment.filename}`;
    const blob = await put(key, attachment.file.stream(), {
      access: "public",
      addRandomSuffix: false,
      contentType: attachment.mimeType,
      token: this.token
    });

    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      artifactUrl: blob.url,
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
  cachedStorage =
    env.ATTACHMENT_STORAGE_BACKEND === "mock"
      ? new MockAttachmentStorage()
      : new VercelBlobAttachmentStorage();
  return cachedStorage;
};
