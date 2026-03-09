import { z } from "zod";

const trimmedString = (max: number, fieldName: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, `${fieldName} is required`)
    .refine((value) => value.length <= max, `${fieldName} must be <= ${max} chars`);

const repositoryName = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "targetRepository must be owner/repo");

export const submissionTypeSchema = z.enum(["bug_report", "feature_request"]);

export const clientTypeSchema = z.enum(["desktop", "web", "mobile", "cli", "service", "other"]);
export const platformSchema = z.enum([
  "windows",
  "macos",
  "linux",
  "ios",
  "android",
  "web",
  "other"
]);
export const releaseChannelSchema = z.enum([
  "stable",
  "beta",
  "alpha",
  "nightly",
  "internal",
  "other"
]);

export const feedbackPayloadSchema = z.object({
  type: submissionTypeSchema,
  title: trimmedString(200, "title"),
  description: trimmedString(20_000, "description"),
  targetRepository: repositoryName,
  source: z.object({
    applicationId: trimmedString(120, "source.applicationId"),
    applicationName: trimmedString(120, "source.applicationName"),
    channel: z.string().trim().max(80).optional(),
    surface: z.string().trim().max(80).optional()
  }),
  systemTelemetry: z.object({
    clientType: clientTypeSchema,
    appVersion: trimmedString(80, "systemTelemetry.appVersion"),
    platform: platformSchema,
    buildNumber: z.string().trim().max(80).optional(),
    platformVersion: z.string().trim().max(80).optional(),
    architecture: z.string().trim().max(80).optional(),
    locale: z.string().trim().max(40).optional(),
    deviceName: z.string().trim().max(160).optional(),
    deviceModel: z.string().trim().max(160).optional(),
    sessionId: z.string().trim().max(160).optional(),
    releaseChannel: releaseChannelSchema.optional()
  }),
  githubUser: z.string().trim().max(80).optional(),
  contact: z
    .object({
      email: z.string().trim().email().max(320).optional(),
      allowFollowUp: z.boolean().optional()
    })
    .optional(),
  clientRequestId: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>;
export type SubmissionType = z.infer<typeof submissionTypeSchema>;

export type AttachmentSummary = {
  filename: string;
  mimeType: string;
  size: number;
  artifactUrl: string;
  excerpt?: string;
};

export type FeedbackSuccessResponse = {
  status: "ok";
  githubIssue: {
    repository: string;
    number: number;
    url: string;
  };
  requestId: string;
  submittedAt: string;
};

export type FeedbackErrorCode =
  | "unauthorized"
  | "invalid_api_key"
  | "forbidden_application"
  | "invalid_request"
  | "invalid_attachment"
  | "attachment_too_large"
  | "repository_not_allowed"
  | "repository_disabled"
  | "rate_limited"
  | "spam_detected"
  | "github_auth_failed"
  | "github_issue_creation_failed"
  | "internal_error";

export type FeedbackErrorResponse = {
  error: {
    code: FeedbackErrorCode;
    message: string;
    details?: unknown;
  };
  requestId: string;
};
