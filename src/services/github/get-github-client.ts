import { getEnv } from "@/config/env";
import { GitHubAppIssueClient } from "@/services/github/github-app-client";
import { getMockModeFromHeader, MockGitHubIssueClient } from "@/services/github/mock-github-client";
import { type GitHubIssueClient } from "@/services/github/types";

export const getGitHubIssueClient = (testModeHeader: string | null): GitHubIssueClient => {
  const env = getEnv();
  if (env.githubMockEnabled) {
    return new MockGitHubIssueClient(getMockModeFromHeader(testModeHeader));
  }
  return new GitHubAppIssueClient();
};
