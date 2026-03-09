import { NextRequest, NextResponse } from "next/server";

import { getEnv } from "@/config/env";
import { AppError, isAppError } from "@/lib/errors";
import { getClientIp, getRequestId } from "@/lib/request";
import {
  enforceRequestSizeLimit,
  validateAttachments
} from "@/services/attachments/attachment-validation";
import { getAttachmentStorage } from "@/services/attachments/attachment-storage";
import { enforceRateLimits } from "@/services/abuse/rate-limit";
import { runSpamChecks } from "@/services/abuse/spam-check";
import { authenticateApiKey } from "@/services/auth/api-key-auth";
import {
  assertRepositoryAllowedForApiKey,
  getEnabledRepositoryConfig
} from "@/services/config/repository-config";
import { getGitHubIssueClient } from "@/services/github/get-github-client";
import { buildIssueTitle, renderIssueBody } from "@/services/issue/render-issue-body";
import { parseFeedbackForm } from "@/services/multipart/parse-feedback-form";
import { type FeedbackErrorResponse, type FeedbackSuccessResponse } from "@/types/feedback";

export const runtime = "nodejs";

const toErrorResponse = (
  requestId: string,
  code: FeedbackErrorResponse["error"]["code"],
  message: string,
  status: number,
  details?: unknown
) =>
  NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {})
      },
      requestId
    } satisfies FeedbackErrorResponse,
    { status }
  );

const getLabelsForSubmission = (
  defaultLabels: string[],
  perTypeLabels: string[],
  fallbackTypeLabel: string
): string[] => {
  const merged = [...defaultLabels, ...perTypeLabels];
  if (merged.length === 0) {
    merged.push(fallbackTypeLabel);
  }
  return [...new Set(merged)];
};

export async function POST(request: NextRequest): Promise<NextResponse<FeedbackSuccessResponse | FeedbackErrorResponse>> {
  const requestId = getRequestId(request);

  try {
    enforceRequestSizeLimit(request.headers.get("content-length"));
    const auth = authenticateApiKey(request.headers.get("authorization"));
    const { payload, attachments } = await parseFeedbackForm(request);

    if (payload.source.applicationId !== auth.apiKeyConfig.applicationId) {
      throw new AppError("forbidden_application", "source.applicationId does not match API key", 403);
    }

    assertRepositoryAllowedForApiKey(payload.targetRepository, auth.apiKeyConfig.allowedRepositories);
    const repositoryConfig = getEnabledRepositoryConfig(payload.targetRepository);

    await enforceRateLimits({
      apiKeyHash: auth.apiKeyHash,
      ipAddress: getClientIp(request)
    });
    await runSpamChecks(payload);

    const env = getEnv();
    const validatedAttachments = await validateAttachments(attachments, env.allowZipAttachments);
    const attachmentStorage = getAttachmentStorage();
    const storedAttachments = await Promise.all(
      validatedAttachments.map((attachment) => attachmentStorage.upload(attachment, requestId))
    );

    const issueTitle = buildIssueTitle(payload);
    const issueBody = renderIssueBody({
      payload,
      attachments: storedAttachments,
      requestId
    });
    const labels = getLabelsForSubmission(
      repositoryConfig.defaultLabels,
      repositoryConfig.labelsByType[payload.type] ?? [],
      payload.type === "bug_report" ? "bug" : "enhancement"
    );

    const githubClient = getGitHubIssueClient(request.headers.get("x-test-github-mode"));
    const issue = await githubClient.createIssue({
      installationId: repositoryConfig.installationId,
      repository: payload.targetRepository,
      title: issueTitle,
      body: issueBody,
      labels
    });

    return NextResponse.json(
      {
        status: "ok",
        githubIssue: {
          repository: issue.repository,
          number: issue.number,
          url: issue.url
        },
        requestId,
        submittedAt: new Date().toISOString()
      } satisfies FeedbackSuccessResponse,
      { status: 200 }
    );
  } catch (error) {
    if (isAppError(error)) {
      return toErrorResponse(requestId, error.code, error.message, error.status, error.details);
    }

    console.error("Unhandled feedback intake error", error);
    return toErrorResponse(requestId, "internal_error", "Internal server error", 500);
  }
}
