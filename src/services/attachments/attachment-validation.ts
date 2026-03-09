import path from "node:path";

import { AppError } from "@/lib/errors";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024;

const dangerousExtensions = new Set([
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "msi",
  "sh",
  "ps1",
  "jar",
  "scr",
  "apk",
  "ipa"
]);

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/json",
  "text/json",
  "application/xml",
  "text/xml",
  "application/yaml",
  "application/x-yaml",
  "text/yaml",
  "text/x-yaml",
  "application/zip"
]);

const extensionToMime = new Map<string, string>([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
  ["txt", "text/plain"],
  ["log", "text/plain"],
  ["json", "application/json"],
  ["xml", "application/xml"],
  ["yaml", "application/yaml"],
  ["yml", "application/yaml"],
  ["zip", "application/zip"]
]);

export type ValidatedAttachment = {
  file: File;
  filename: string;
  extension: string;
  mimeType: string;
  size: number;
  textExcerpt?: string;
};

const isTextLike = (mimeType: string, extension: string): boolean =>
  mimeType.startsWith("text/") || ["log", "txt", "json", "xml", "yaml", "yml"].includes(extension);

const sanitizeFilename = (filename: string): string =>
  filename
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);

const redactSecrets = (value: string): string =>
  value
    .replace(/(bearer\s+)[a-z0-9\-._~+/]+=*/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s]+/gi, "$1[REDACTED]")
    .replace(/(token\s*[:=]\s*)[^\s]+/gi, "$1[REDACTED]")
    .replace(/(password\s*[:=]\s*)[^\s]+/gi, "$1[REDACTED]")
    .replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_ACCESS_KEY]");

const buildExcerpt = async (file: File, extension: string, mimeType: string): Promise<string | undefined> => {
  if (!isTextLike(mimeType, extension) || file.size > 200 * 1024) {
    return undefined;
  }
  const rawText = await file.text();
  const excerpt = rawText.slice(0, 1200).trim();
  if (!excerpt) {
    return undefined;
  }
  return redactSecrets(excerpt);
};

export const enforceRequestSizeLimit = (contentLengthHeader: string | null): void => {
  if (!contentLengthHeader) {
    return;
  }
  const contentLength = Number(contentLengthHeader);
  if (!Number.isFinite(contentLength)) {
    return;
  }
  if (contentLength > MAX_TOTAL_SIZE_BYTES) {
    throw new AppError("attachment_too_large", "Request exceeds 25MB limit", 413);
  }
};

export const validateAttachments = async (
  files: File[],
  allowZipAttachments: boolean
): Promise<ValidatedAttachment[]> => {
  if (files.length > MAX_ATTACHMENTS) {
    throw new AppError("invalid_attachment", "Maximum of 5 attachments is allowed", 400);
  }

  let totalSize = 0;
  const results: ValidatedAttachment[] = [];

  for (const file of files) {
    const filename = sanitizeFilename(file.name || "attachment");
    const extension = path.extname(filename).replace(".", "").toLowerCase();
    const providedMime = file.type.toLowerCase();
    const inferredMime = extensionToMime.get(extension);
    const mimeType = providedMime || inferredMime || "";

    if (!extension || dangerousExtensions.has(extension)) {
      throw new AppError("invalid_attachment", `Attachment ${filename} has a forbidden file type`, 400);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new AppError("attachment_too_large", `Attachment ${filename} exceeds 10MB limit`, 413);
    }
    if (extension === "zip" && !allowZipAttachments) {
      throw new AppError("invalid_attachment", "ZIP attachments are disabled", 400);
    }
    if (!extensionToMime.has(extension)) {
      throw new AppError("invalid_attachment", `Attachment ${filename} extension is not allowed`, 400);
    }
    if (!allowedMimeTypes.has(mimeType)) {
      throw new AppError("invalid_attachment", `Attachment ${filename} MIME type is not allowed`, 400);
    }

    totalSize += file.size;
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      throw new AppError("attachment_too_large", "Total attachment payload exceeds 25MB limit", 413);
    }

    results.push({
      file,
      filename,
      extension,
      mimeType,
      size: file.size,
      textExcerpt: await buildExcerpt(file, extension, mimeType)
    });
  }

  return results;
};
