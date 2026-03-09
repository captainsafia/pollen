import { timingSafeEqual } from "node:crypto";

import { getRuntimeConfig, sha256Hex, type ApiKeyConfig } from "@/config/runtime-config";
import { AppError } from "@/lib/errors";

export type AuthResult = {
  apiKeyConfig: ApiKeyConfig;
  apiKeyHash: string;
};

const parseBearerToken = (authorizationHeader: string | null): string => {
  if (!authorizationHeader) {
    throw new AppError("unauthorized", "Authorization header is required", 401);
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError("unauthorized", "Authorization must be Bearer <api-key>", 401);
  }
  return token.trim();
};

const isConstantTimeEqual = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
};

export const authenticateApiKey = (authorizationHeader: string | null): AuthResult => {
  const token = parseBearerToken(authorizationHeader);
  const hashedToken = sha256Hex(token);
  const { apiKeys } = getRuntimeConfig();

  const match = apiKeys.find((config) => isConstantTimeEqual(config.keyHash, hashedToken));
  if (!match) {
    throw new AppError("invalid_api_key", "API key is invalid", 401);
  }
  if (!match.enabled) {
    throw new AppError("invalid_api_key", "API key is disabled", 401);
  }

  return {
    apiKeyConfig: match,
    apiKeyHash: hashedToken
  };
};
