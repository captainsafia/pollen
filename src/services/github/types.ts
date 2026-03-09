export type CreateIssueInput = {
  installationId: number;
  repository: string;
  title: string;
  body: string;
  labels: string[];
};

export type CreatedIssue = {
  repository: string;
  number: number;
  url: string;
};

export interface GitHubIssueClient {
  createIssue(input: CreateIssueInput): Promise<CreatedIssue>;
}
