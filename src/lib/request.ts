import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

export const getRequestId = (request: NextRequest): string =>
  request.headers.get("x-request-id")?.trim() || randomUUID();

export const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
};
