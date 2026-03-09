import { getEnv } from "@/config/env";
import { AppError } from "@/lib/errors";
import { getWindowStore } from "@/services/abuse/window-store";

type RateLimitInput = {
  apiKeyHash: string;
  ipAddress: string;
};

export const enforceRateLimits = async ({ apiKeyHash, ipAddress }: RateLimitInput): Promise<void> => {
  const env = getEnv();
  const store = getWindowStore();
  const keyWindow = env.RATE_LIMIT_API_KEY_WINDOW_SECONDS;
  const ipWindow = env.RATE_LIMIT_IP_WINDOW_SECONDS;

  const keyCount = await store.increment(`ratelimit:key:${apiKeyHash}`, keyWindow);
  if (keyCount > env.RATE_LIMIT_API_KEY_MAX_REQUESTS) {
    throw new AppError("rate_limited", "API key rate limit exceeded", 429, {
      scope: "api_key",
      windowSeconds: keyWindow
    });
  }

  const ipCount = await store.increment(`ratelimit:ip:${ipAddress}`, ipWindow);
  if (ipCount > env.RATE_LIMIT_IP_MAX_REQUESTS) {
    throw new AppError("rate_limited", "IP rate limit exceeded", 429, {
      scope: "ip",
      windowSeconds: ipWindow
    });
  }
};
