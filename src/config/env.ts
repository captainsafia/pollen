import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RATE_LIMIT_BACKEND: z.enum(["upstash", "memory"]).default("upstash"),
  RATE_LIMIT_API_KEY_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_API_KEY_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_IP_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_IP_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
  SPAM_DEDUPE_WINDOW_SECONDS: z.coerce.number().int().positive().default(300),
  SPAM_MAX_URLS: z.coerce.number().int().positive().default(6),
  ALLOW_ZIP_ATTACHMENTS: z.enum(["true", "false"]).default("false"),
  ATTACHMENT_STORAGE_BACKEND: z.enum(["vercel_blob", "mock"]).default("vercel_blob"),
  BLOB_READ_WRITE_TOKEN: z.string().trim().optional(),
  BLOB_KEY_PREFIX: z.string().trim().default("feedback-intake"),
  UPSTASH_REDIS_REST_URL: z.string().trim().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().optional(),
  GITHUB_APP_ID: z.string().trim().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().trim().optional(),
  GITHUB_API_BASE_URL: z.string().trim().default("https://api.github.com"),
  GITHUB_MOCK_ENABLED: z.enum(["true", "false"]).default("false")
});

export type Env = z.infer<typeof envSchema> & {
  allowZipAttachments: boolean;
  githubMockEnabled: boolean;
};

let cachedEnv: Env | null = null;

export const getEnv = (): Env => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.parse(process.env);
  cachedEnv = {
    ...parsed,
    allowZipAttachments: parsed.ALLOW_ZIP_ATTACHMENTS === "true",
    githubMockEnabled: parsed.GITHUB_MOCK_ENABLED === "true"
  };
  return cachedEnv;
};
