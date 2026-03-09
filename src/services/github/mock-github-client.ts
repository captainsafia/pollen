import { createHash } from "node:crypto";

import { AppError } from "@/lib/errors";
import { type CreateIssueInput, type CreatedIssue, type GitHubIssueClient } from "@/services/github/types";

type MockMode = "none" | "auth_fail" | "issue_fail";

export class MockGitHubIssueClient implements GitHubIssueClient {
  constructor(private readonly mode: MockMode = "none") {}

  async createIssue(input: CreateIssueInput): Promise<CreatedIssue> {
    if (this.mode === "auth_fail") {
      throw new AppError("github_auth_failed", "Mocked GitHub auth failure", 502);
    }
    if (this.mode === "issue_fail") {
      throw new AppError("github_issue_creation_failed", "Mocked GitHub issue creation failure", 502);
    }

    const issueSeed = createHash("sha256").update(input.title).digest("hex").slice(0, 6);
    return {
      repository: input.repository,
      number: Number.parseInt(issueSeed, 16) % 10_000,
      url: `https://github.com/${input.repository}/issues/${Number.parseInt(issueSeed, 16) % 10_000}`
    };
  }
}

export const getMockModeFromHeader = (value: string | null): MockMode => {
  if (value === "auth_fail" || value === "issue_fail") {
    return value;
  }
  return "none";
};
