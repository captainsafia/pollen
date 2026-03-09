import { createHash } from "node:crypto";
import { z } from "zod";

const apiKeyConfigSchema = z.object({
  keyId: z.string().trim().min(1),
  keyHash: z.string().trim().min(1),
  applicationId: z.string().trim().min(1),
  enabled: z.boolean(),
  allowedRepositories: z.array(z.string().trim().min(1)).min(1)
});

const repositoryConfigSchema = z.object({
  name: z.string().trim().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  installationId: z.number().int().positive(),
  enabled: z.boolean(),
  defaultLabels: z.array(z.string().trim().min(1)).default([]),
  labelsByType: z
    .object({
      bug_report: z.array(z.string().trim().min(1)).default([]),
      feature_request: z.array(z.string().trim().min(1)).default([])
    })
    .default({
      bug_report: [],
      feature_request: []
    })
});

const configSchema = z.object({
  apiKeys: z.array(apiKeyConfigSchema).min(1),
  repositories: z.array(repositoryConfigSchema).min(1)
});

export type ApiKeyConfig = z.infer<typeof apiKeyConfigSchema>;
export type RepositoryConfig = z.infer<typeof repositoryConfigSchema>;
export type RuntimeConfig = z.infer<typeof configSchema>;

let cachedConfig: RuntimeConfig | null = null;

const parseJson = <T>(raw: string, schema: z.ZodSchema<T>, field: string): T => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${field} must be valid JSON: ${(error as Error).message}`);
  }
  return schema.parse(parsed);
};

export const sha256Hex = (value: string): string => createHash("sha256").update(value).digest("hex");

export const getRuntimeConfig = (): RuntimeConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKeysJson = process.env.FEEDBACK_API_KEYS_JSON;
  const repositoriesJson = process.env.FEEDBACK_REPOSITORIES_JSON;
  if (!apiKeysJson || !repositoriesJson) {
    throw new Error("FEEDBACK_API_KEYS_JSON and FEEDBACK_REPOSITORIES_JSON are required");
  }

  const apiKeys = parseJson(apiKeysJson, z.array(apiKeyConfigSchema), "FEEDBACK_API_KEYS_JSON");
  const repositories = parseJson(
    repositoriesJson,
    z.array(repositoryConfigSchema),
    "FEEDBACK_REPOSITORIES_JSON"
  );

  cachedConfig = configSchema.parse({ apiKeys, repositories });
  return cachedConfig;
};
