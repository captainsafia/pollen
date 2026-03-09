import { createHash } from "node:crypto";

import { getEnv } from "@/config/env";
import { AppError } from "@/lib/errors";
import { getWindowStore } from "@/services/abuse/window-store";
import { type FeedbackPayload } from "@/types/feedback";

const spamPhrases = [
  "buy now",
  "free money",
  "work from home",
  "earn cash fast",
  "limited time offer",
  "click this link"
];

const countUrls = (input: string): number => (input.match(/https?:\/\/[^\s)]+/gi) ?? []).length;

const isMostlyGibberish = (input: string): boolean => {
  const text = input.replace(/\s+/g, " ").trim();
  if (text.length < 20) {
    return false;
  }
  const alphaNum = (text.match(/[A-Za-z0-9]/g) ?? []).length;
  const ratio = alphaNum / text.length;
  const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
  return ratio < 0.45 || uniqueWords < 3;
};

export const runSpamChecks = async (payload: FeedbackPayload): Promise<void> => {
  const env = getEnv();
  const store = getWindowStore();
  const normalized = `${payload.title} ${payload.description}`.replace(/\s+/g, " ").toLowerCase().trim();
  const hash = createHash("sha256").update(normalized).digest("hex");
  const dedupeKey = `spam:dedupe:${hash}`;
  const firstSeen = await store.setIfAbsent(dedupeKey, "1", env.SPAM_DEDUPE_WINDOW_SECONDS);
  if (!firstSeen) {
    throw new AppError("spam_detected", "Repeated identical submission", 429);
  }

  const urlCount = countUrls(normalized);
  if (urlCount > env.SPAM_MAX_URLS) {
    throw new AppError("spam_detected", "Submission contains too many URLs", 400, {
      urlCount
    });
  }

  if (spamPhrases.some((phrase) => normalized.includes(phrase))) {
    throw new AppError("spam_detected", "Submission matched known spam phrases", 400);
  }

  if (isMostlyGibberish(normalized)) {
    throw new AppError("spam_detected", "Submission appears to be gibberish", 400);
  }
};
