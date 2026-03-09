import { createPrivateKey } from "node:crypto";

import { SignJWT, importPKCS8 } from "jose";

import { getEnv } from "@/config/env";
import { AppError } from "@/lib/errors";
import { type CreateIssueInput, type CreatedIssue, type GitHubIssueClient } from "@/services/github/types";

type InstallationTokenResponse = {
  token: string;
};

type IssueResponse = {
  number: number;
  html_url: string;
};

const createAppJwt = async (appId: string, privateKeyPem: string): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(privateKeyPem, "RS256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(now - 30)
    .setExpirationTime(now + 540)
    .setIssuer(appId)
    .sign(key);
};

const assertValidPrivateKey = (value: string): string => {
  const normalized = value.replace(/\\n/g, "\n");
  createPrivateKey(normalized);
  return normalized;
};

export class GitHubAppIssueClient implements GitHubIssueClient {
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly apiBaseUrl: string;

  constructor() {
    const env = getEnv();
    if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
      throw new AppError("github_auth_failed", "GitHub App credentials are missing", 500);
    }
    this.appId = env.GITHUB_APP_ID;
    this.privateKey = assertValidPrivateKey(env.GITHUB_APP_PRIVATE_KEY);
    this.apiBaseUrl = env.GITHUB_API_BASE_URL;
  }

  private async createInstallationToken(installationId: number): Promise<string> {
    const jwt = await createAppJwt(this.appId, this.privateKey);
    const response = await fetch(`${this.apiBaseUrl}/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (!response.ok) {
      const details = await response.text();
      throw new AppError("github_auth_failed", "Failed to exchange installation token", 502, details);
    }

    const data = (await response.json()) as InstallationTokenResponse;
    return data.token;
  }

  async createIssue(input: CreateIssueInput): Promise<CreatedIssue> {
    const [owner, repo] = input.repository.split("/");
    const installationToken = await this.createInstallationToken(input.installationId);
    const response = await fetch(`${this.apiBaseUrl}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${installationToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        labels: input.labels
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new AppError("github_issue_creation_failed", "Failed to create GitHub issue", 502, details);
    }

    const issue = (await response.json()) as IssueResponse;
    return {
      repository: input.repository,
      number: issue.number,
      url: issue.html_url
    };
  }
}
